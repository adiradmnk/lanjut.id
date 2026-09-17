package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

const feedbackSelectColumns = `
	id::text, tenant_id, member_id, raw_text, COALESCE(intent, ''), COALESCE(category, ''),
	COALESCE(preferred_time_of_day, ''), preferred_days::text, COALESCE(churn_risk_score, 0),
	COALESCE(sentiment, ''), COALESCE(root_cause_summary, ''), COALESCE(recommended_action, ''),
	COALESCE(ai_engine_source, ''), status, created_at::text`

// NewFeedbackInput is what CreateFeedback needs. The AI-derived fields are all optional —
// if translation failed or the sidecar was unreachable, only TenantID/MemberID/RawText need
// to be set and the row is still saved.
type NewFeedbackInput struct {
	TenantID           string
	MemberID           string
	RawText            string
	Intent             string
	Category           string
	PreferredTimeOfDay string
	PreferredDays      json.RawMessage
	ChurnRiskScore     float64
	Sentiment          string
	RootCauseSummary   string
	RecommendedAction  string
	AIEngineSource     string
}

// CreateFeedback records a customer's complaint, translated or not.
func (s *Store) CreateFeedback(ctx context.Context, in NewFeedbackInput) (*models.Feedback, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO feedback (tenant_id, member_id, raw_text, intent, category, preferred_time_of_day,
		                      preferred_days, churn_risk_score, sentiment, root_cause_summary,
		                      recommended_action, ai_engine_source, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'NEW')
		RETURNING `+feedbackSelectColumns,
		in.TenantID, in.MemberID, in.RawText, nullIfEmpty(in.Intent), nullIfEmpty(in.Category),
		nullIfEmpty(in.PreferredTimeOfDay), nullIfEmptyJSON(in.PreferredDays), in.ChurnRiskScore,
		nullIfEmpty(in.Sentiment), nullIfEmpty(in.RootCauseSummary), nullIfEmpty(in.RecommendedAction),
		nullIfEmpty(in.AIEngineSource))
	return scanFeedback(row)
}

// ListFeedbackByTenant returns every feedback entry for a merchant, newest first — this is
// the merchant-facing inbox, kept as a separate endpoint/table from transaction history.
func (s *Store) ListFeedbackByTenant(ctx context.Context, tenantID string) ([]models.Feedback, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+feedbackSelectColumns+`
		FROM feedback WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Feedback
	for rows.Next() {
		f, err := scanFeedback(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *f)
	}
	return out, rows.Err()
}

// ListFeedbackByMember returns a customer's own feedback history, newest first.
func (s *Store) ListFeedbackByMember(ctx context.Context, memberID string) ([]models.Feedback, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+feedbackSelectColumns+`
		FROM feedback WHERE member_id = $1 ORDER BY created_at DESC`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Feedback
	for rows.Next() {
		f, err := scanFeedback(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *f)
	}
	return out, rows.Err()
}

func scanFeedback(row rowScanner) (*models.Feedback, error) {
	var f models.Feedback
	var preferredDays *string
	err := row.Scan(&f.ID, &f.TenantID, &f.MemberID, &f.RawText, &f.Intent, &f.Category,
		&f.PreferredTimeOfDay, &preferredDays, &f.ChurnRiskScore, &f.Sentiment, &f.RootCauseSummary,
		&f.RecommendedAction, &f.AIEngineSource, &f.Status, &f.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan feedback: %w", err)
	}
	if preferredDays != nil {
		f.PreferredDays = json.RawMessage(*preferredDays)
	}
	return &f, nil
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullIfEmptyJSON(b json.RawMessage) any {
	if len(b) == 0 {
		return nil
	}
	return b
}
