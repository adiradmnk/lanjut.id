package store

// The "Dataset 900" stress-test/audit view is backed by the real synthetic member cohort
// seeded under tenant IDs mch-gen-1/2/3 (see tools/seed_900.sql) — 900 real rows in the
// members table, not generated on the fly. This file queries that real data directly
// instead of synthesizing fake names/risk flags per request.

import (
	"context"
	"fmt"

	"lanjut/backend/internal/models"
)

const dataset900TenantPrefix = "mch-gen-%"

type Dataset900Summary struct {
	TotalActiveMembers   int
	HighRiskCritical     int
	MediumRiskDrift      int
	LowRiskStable        int
	AvgChurnRiskPct      float64
	AutonomousDispatched int
}

// GetDataset900Summary aggregates the real seeded cohort: member counts by risk flag from
// members, and the average churn probability + intervention count from churn_history (the
// same table InsertChurnHistory writes to for real detected churn events).
func (s *Store) GetDataset900Summary(ctx context.Context) (Dataset900Summary, error) {
	var out Dataset900Summary
	err := s.pool.QueryRow(ctx, `
		SELECT
			count(*) FILTER (WHERE true),
			count(*) FILTER (WHERE churn_risk_flag = 'HIGH'),
			count(*) FILTER (WHERE churn_risk_flag = 'MEDIUM'),
			count(*) FILTER (WHERE churn_risk_flag = 'LOW')
		FROM members WHERE tenant_id LIKE $1
	`, dataset900TenantPrefix).Scan(&out.TotalActiveMembers, &out.HighRiskCritical, &out.MediumRiskDrift, &out.LowRiskStable)
	if err != nil {
		return out, err
	}

	err = s.pool.QueryRow(ctx, `
		SELECT coalesce(avg(churn_probability) * 100, 0), count(*) FILTER (WHERE intervention_trigger IS NOT NULL)
		FROM churn_history WHERE tenant_id LIKE $1
	`, dataset900TenantPrefix).Scan(&out.AvgChurnRiskPct, &out.AutonomousDispatched)
	if err != nil {
		return out, err
	}

	return out, nil
}

type Dataset900Filter struct {
	RiskFlag string // "", "HIGH", "MEDIUM", "LOW"
	Search   string
	Limit    int
}

// ListDataset900Members returns real members from the seeded cohort, filtered by risk flag
// and/or a name/id substring search, plus the total match count (for "showing 25 of N").
func (s *Store) ListDataset900Members(ctx context.Context, f Dataset900Filter) ([]models.Member, int, error) {
	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 25
	}

	where := `tenant_id LIKE $1`
	args := []any{dataset900TenantPrefix}
	argN := 2

	if f.RiskFlag != "" && f.RiskFlag != "ALL" {
		where += fmt.Sprintf(" AND churn_risk_flag = $%d", argN)
		args = append(args, f.RiskFlag)
		argN++
	}
	if f.Search != "" {
		where += fmt.Sprintf(" AND (lower(name) LIKE $%d OR lower(id) LIKE $%d)", argN, argN)
		args = append(args, "%"+f.Search+"%")
		argN++
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM members WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit)
	rows, err := s.pool.Query(ctx, `SELECT `+memberSelectColumns+` FROM members WHERE `+where+` ORDER BY id LIMIT $`+fmt.Sprint(argN), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []models.Member
	for rows.Next() {
		m, err := scanMember(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *m)
	}
	return out, total, rows.Err()
}
