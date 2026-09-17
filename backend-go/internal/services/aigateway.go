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

type GrievanceAnalysis struct {
	MemberName        string   `json:"member_name"`
	Intent            string   `json:"intent"`
	Category          string   `json:"category"`
	PreferredTimeOfDay string  `json:"preferred_time_of_day"`
	PreferredDays     []string `json:"preferred_days"`
	ChurnRiskScore    float64  `json:"churn_risk_score"`
	Sentiment         string   `json:"sentiment"`
	RootCauseSummary  string   `json:"root_cause_summary"`
	RecommendedAction string   `json:"recommended_action"`
	EngineSource      string   `json:"engine_source"`
	ProcessingTimeMs  float64  `json:"processing_time_ms"`
}

func (a *AIGateway) TranslateGrievance(ctx context.Context, memberName, complaint, currentPkg string) *GrievanceAnalysis {
	reqPayload := map[string]any{
		"member_name":         memberName,
		"free_text_complaint": complaint,
		"current_package":     currentPkg,
	}
	bodyJSON, err := json.Marshal(reqPayload)
	if err != nil {
		return a.fallbackGrievance(memberName, complaint)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 2500*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/retention/translate-grievance", bytes.NewReader(bodyJSON))
	if err != nil {
		return a.fallbackGrievance(memberName, complaint)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return a.fallbackGrievance(memberName, complaint)
	}
	defer resp.Body.Close()

	var result GrievanceAnalysis
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return a.fallbackGrievance(memberName, complaint)
	}
	return &result
}

func (a *AIGateway) fallbackGrievance(memberName, complaint string) *GrievanceAnalysis {
	return &GrievanceAnalysis{
		MemberName:        memberName,
		Intent:            "cancellation_request",
		Category:          "schedule_conflict",
		PreferredTimeOfDay: "EVENING",
		PreferredDays:     []string{"THURSDAY", "FRIDAY"},
		ChurnRiskScore:    0.85,
		Sentiment:         "NEGATIVE",
		RootCauseSummary:  complaint,
		RecommendedAction: "offer_alternative_schedule",
		EngineSource:      "LANJUT Fallback Engine",
		ProcessingTimeMs:  5.0,
	}
}
