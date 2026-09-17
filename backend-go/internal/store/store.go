package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"lanjut/backend/internal/models"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) GetTenant(ctx context.Context, id string) (*models.Tenant, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, business_name, category, bni_account_number, bni_company_code, bni_va_prefix,
		       loan_plafond_idr, monthly_installment_idr, loan_tenor_months,
		       max_discount_pct, min_margin_floor_idr, min_slot_fill_ratio_target, auto_intervention_threshold_days
		FROM tenants WHERE id = $1`, id)
	return scanTenant(row)
}

func (s *Store) GetFirstTenant(ctx context.Context) (*models.Tenant, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, business_name, category, bni_account_number, bni_company_code, bni_va_prefix,
		       loan_plafond_idr, monthly_installment_idr, loan_tenor_months,
		       max_discount_pct, min_margin_floor_idr, min_slot_fill_ratio_target, auto_intervention_threshold_days
		FROM tenants ORDER BY id LIMIT 1`)
	return scanTenant(row)
}

func (s *Store) ListTenants(ctx context.Context) ([]models.Tenant, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, business_name, category, bni_account_number, bni_company_code, bni_va_prefix,
		       loan_plafond_idr, monthly_installment_idr, loan_tenor_months,
		       max_discount_pct, min_margin_floor_idr, min_slot_fill_ratio_target, auto_intervention_threshold_days
		FROM tenants ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Tenant
	for rows.Next() {
		t, err := scanTenant(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanTenant(row rowScanner) (*models.Tenant, error) {
	var t models.Tenant
	err := row.Scan(&t.ID, &t.BusinessName, &t.Category, &t.BNIAccountNumber, &t.BNICompanyCode, &t.BNIVAPrefix,
		&t.LoanPlafondIDR, &t.MonthlyInstallmentIDR, &t.LoanTenorMonths,
		&t.Config.MaxDiscountPct, &t.Config.MinMarginFloorIDR, &t.Config.MinSlotFillRatioTarget, &t.Config.AutoInterventionDays)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan tenant: %w", err)
	}
	return &t, nil
}

func (s *Store) GetMember(ctx context.Context, id string) (*models.Member, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, name, email, phone, current_package, package_tier,
		       COALESCE(active_until::text, ''), total_quota, used_quota, joined_at::text, churn_risk_flag
		FROM members WHERE id = $1`, id)
	return scanMember(row)
}

func (s *Store) GetFirstMember(ctx context.Context) (*models.Member, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, name, email, phone, current_package, package_tier,
		       COALESCE(active_until::text, ''), total_quota, used_quota, joined_at::text, churn_risk_flag
		FROM members ORDER BY id LIMIT 1`)
	return scanMember(row)
}

func (s *Store) ListMembersByTenant(ctx context.Context, tenantID string) ([]models.Member, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, name, email, phone, current_package, package_tier,
		       COALESCE(active_until::text, ''), total_quota, used_quota, joined_at::text, churn_risk_flag
		FROM members WHERE tenant_id = $1 ORDER BY id`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Member
	for rows.Next() {
		m, err := scanMember(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *m)
	}
	return out, rows.Err()
}

func scanMember(row rowScanner) (*models.Member, error) {
	var m models.Member
	err := row.Scan(&m.ID, &m.TenantID, &m.Name, &m.Email, &m.Phone, &m.CurrentPackage, &m.PackageTier,
		&m.ActiveUntil, &m.TotalQuota, &m.UsedQuota, &m.JoinedAt, &m.ChurnRiskFlag)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan member: %w", err)
	}
	return &m, nil
}

func (s *Store) GetSession(ctx context.Context, id string) (*models.ClassSession, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, tenant_id, title, day_of_week, time_slot, time_of_day, instructor,
		       total_capacity, booked_slots, price_per_session_idr
		FROM class_sessions WHERE id = $1`, id)
	return scanSession(row)
}

func (s *Store) ListAvailableSessions(ctx context.Context, tenantID string) ([]models.ClassSession, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, tenant_id, title, day_of_week, time_slot, time_of_day, instructor,
		       total_capacity, booked_slots, price_per_session_idr
		FROM class_sessions WHERE tenant_id = $1 ORDER BY id`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.ClassSession
	for rows.Next() {
		sess, err := scanSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *sess)
	}
	return out, rows.Err()
}

func scanSession(row rowScanner) (*models.ClassSession, error) {
	var c models.ClassSession
	err := row.Scan(&c.ID, &c.TenantID, &c.Title, &c.DayOfWeek, &c.TimeSlot, &c.TimeOfDay, &c.Instructor,
		&c.TotalCapacity, &c.BookedSlots, &c.PricePerSessionIDR)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan session: %w", err)
	}
	return &c, nil
}

// IncrementSessionBooking increments booked_slots for a session, capped at total_capacity.
func (s *Store) IncrementSessionBooking(ctx context.Context, sessionID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE class_sessions SET booked_slots = LEAST(booked_slots + 1, total_capacity)
		WHERE id = $1`, sessionID)
	return err
}

func (s *Store) CreatePendingTransaction(ctx context.Context, trx models.Transaction) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO transactions (trx_id, tenant_id, member_id, session_id, session_title, amount,
		                          bni_va_number, bni_signature, status, idempotency_key)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $1)
		ON CONFLICT (trx_id) DO NOTHING`,
		trx.TrxID, trx.TenantID, trx.MemberID, trx.SessionID, trx.SessionTitle, trx.Amount, trx.VANumber, trx.Signature)
	return err
}

func (s *Store) GetTransaction(ctx context.Context, trxID string) (*models.Transaction, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT trx_id, tenant_id, member_id, session_id, session_title, amount, bni_va_number, bni_signature,
		       status, created_at::text, paid_at::text
		FROM transactions WHERE trx_id = $1`, trxID)

	var t models.Transaction
	var paidAt *string
	err := row.Scan(&t.TrxID, &t.TenantID, &t.MemberID, &t.SessionID, &t.SessionTitle, &t.Amount, &t.VANumber,
		&t.Signature, &t.Status, &t.CreatedAt, &paidAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan transaction: %w", err)
	}
	t.PaidAt = paidAt
	return &t, nil
}

// SettleTransaction marks a PENDING transaction PAID exactly once (idempotent).
// Returns (transaction, alreadyProcessed, error).
func (s *Store) SettleTransaction(ctx context.Context, trxID string) (*models.Transaction, bool, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE transactions SET status = 'PAID', paid_at = now()
		WHERE trx_id = $1 AND status = 'PENDING'`, trxID)
	if err != nil {
		return nil, false, err
	}

	trx, err := s.GetTransaction(ctx, trxID)
	if err != nil {
		return nil, false, err
	}

	alreadyProcessed := tag.RowsAffected() == 0
	if !alreadyProcessed {
		_ = s.IncrementSessionBooking(ctx, trx.SessionID)
		_, _ = s.pool.Exec(ctx, `
			UPDATE members SET used_quota = used_quota + 1, churn_risk_flag = 'LOW'
			WHERE id = $1`, trx.MemberID)
	}
	return trx, alreadyProcessed, nil
}

func (s *Store) SaveMagicToken(ctx context.Context, memberID, tokenHash string, expiresAtUnixMs int64) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO magic_tokens (member_id, token_hash, expires_at)
		VALUES ($1, $2, to_timestamp($3::double precision / 1000))
		ON CONFLICT (token_hash) DO NOTHING`, memberID, tokenHash, expiresAtUnixMs)
	return err
}
