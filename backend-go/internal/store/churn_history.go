package store

import (
	"context"
	"time"
)

type ChurnHistoryEvent struct {
	ID                  string    `json:"id"`
	TenantID            string    `json:"tenant_id"`
	MemberID            string    `json:"member_id"`
	ChurnProbability    float64   `json:"churn_probability"`
	ChurnRiskLevel      string    `json:"churn_risk_level"`
	DetectedPattern     string    `json:"detected_pattern"`
	RootCause           string    `json:"root_cause"`
	InterventionTrigger string    `json:"intervention_trigger"`
	CreatedAt           time.Time `json:"created_at"`
}

func (s *Store) InsertChurnHistory(ctx context.Context, e ChurnHistoryEvent) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO churn_history (tenant_id, member_id, churn_probability, churn_risk_level, detected_pattern, root_cause, intervention_trigger)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, e.TenantID, e.MemberID, e.ChurnProbability, e.ChurnRiskLevel, e.DetectedPattern, e.RootCause, e.InterventionTrigger)
	return err
}

func (s *Store) ListChurnEventsByTenant(ctx context.Context, tenantID string) ([]ChurnHistoryEvent, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, member_id, churn_probability, churn_risk_level, detected_pattern, root_cause, intervention_trigger, created_at
		FROM churn_history
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []ChurnHistoryEvent
	for rows.Next() {
		var e ChurnHistoryEvent
		if err := rows.Scan(&e.ID, &e.TenantID, &e.MemberID, &e.ChurnProbability, &e.ChurnRiskLevel, &e.DetectedPattern, &e.RootCause, &e.InterventionTrigger, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, nil
}
