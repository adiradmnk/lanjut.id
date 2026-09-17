package services

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"lanjut/backend/internal/models"
)

type AIGateway struct {
	baseURL string
	client  *http.Client
}

func NewAIGateway(baseURL string) *AIGateway {
	return &AIGateway{
		baseURL: baseURL,
		client:  &http.Client{Timeout: 500 * time.Millisecond},
	}
}

type rankSessionInput struct {
	ID                  string  `json:"id"`
	Title               string  `json:"title"`
	DayOfWeek           string  `json:"day_of_week"`
	TimeSlot            string  `json:"time_slot"`
	TimeOfDay           string  `json:"time_of_day"`
	TotalCapacity       int     `json:"total_capacity"`
	BookedSlots         int     `json:"booked_slots"`
	PricePerSessionIDR  float64 `json:"price_per_session_idr"`
}

type rankSmartOptionsRequest struct {
	MemberID          string              `json:"member_id"`
	MemberName        string              `json:"member_name"`
	RemainingQuota    int                 `json:"remaining_quota"`
	DaysToExpiry      int                 `json:"days_to_expiry"`
	TenantConstraint  *models.TenantConfig `json:"tenant_constraint,omitempty"`
	AvailableSessions []rankSessionInput  `json:"available_sessions"`
}

type rankSmartOptionsResponse struct {
	Options []models.SmartOption `json:"options"`
}

// RankSmartOptions calls the FastAPI sidecar with a fast 500ms SLA; on any error
// (offline, timeout, malformed response) it falls back to the deterministic local
// engine within microseconds instead of blocking the member portal.
func (a *AIGateway) RankSmartOptions(ctx context.Context, member *models.Member, tenant *models.Tenant, sessions []models.ClassSession) []models.SmartOption {
	sessInputs := make([]rankSessionInput, 0, len(sessions))
	for _, s := range sessions {
		sessInputs = append(sessInputs, rankSessionInput{
			ID: s.ID, Title: s.Title, DayOfWeek: s.DayOfWeek, TimeSlot: s.TimeSlot,
			TimeOfDay: s.TimeOfDay, TotalCapacity: s.TotalCapacity, BookedSlots: s.BookedSlots,
			PricePerSessionIDR: s.PricePerSessionIDR,
		})
	}

	reqBody := rankSmartOptionsRequest{
		MemberID:          member.ID,
		MemberName:        member.Name,
		RemainingQuota:    max(0, member.TotalQuota-member.UsedQuota),
		DaysToExpiry:      7,
		AvailableSessions: sessInputs,
	}
	if tenant != nil {
		reqBody.TenantConstraint = &tenant.Config
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return GenerateSmartOptions(member, tenant, sessions)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost,
		a.baseURL+"/api/v1/retention/rank-smart-options", bytes.NewReader(bodyJSON))
	if err != nil {
		return GenerateSmartOptions(member, tenant, sessions)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		slog.Info("ai gateway offline/timeout, using local deterministic engine", "err", err)
		return GenerateSmartOptions(member, tenant, sessions)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return GenerateSmartOptions(member, tenant, sessions)
	}

	var out rankSmartOptionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil || len(out.Options) == 0 {
		return GenerateSmartOptions(member, tenant, sessions)
	}
	return out.Options
}
