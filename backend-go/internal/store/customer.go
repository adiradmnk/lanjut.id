package store

// FASE 3 — customer-side interactions: cancel (never gated on giving a reason), feedback
// (deduped per context), a single shared CanContact gate every outbound-to-customer path
// goes through, and a bounded payment reminder batch that escalates to a human instead of
// nagging forever.

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

// CancelSubscription marks a member's subscription CANCELLED exactly once (idempotent) —
// never gated on the customer providing a reason first; feedback (if any) is a separate,
// optional call (CreateMemberFeedback).
func (s *Store) CancelSubscription(ctx context.Context, memberID string) (member *models.Member, alreadyProcessed bool, err error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE members SET subscription_status = 'CANCELLED'
		WHERE id = $1 AND subscription_status != 'CANCELLED'`, memberID)
	if err != nil {
		return nil, false, err
	}

	m, err := s.GetMember(ctx, memberID)
	if err != nil {
		return nil, false, err
	}
	return m, tag.RowsAffected() == 0, nil
}

const memberFeedbackSelectColumns = `
	id::text, member_id, tenant_id, context_type, context_ref_id,
	COALESCE(reason_code, ''), COALESCE(free_text, ''), created_at::text`

// NewMemberFeedbackInput is what CreateMemberFeedback needs. ContextRefID may be "" for
// contexts with no natural ref (e.g. a generic PULSE_CHECK) — never nil/NULL, so the
// member_id+context_type+context_ref_id UNIQUE constraint reliably dedupes (see migration
// 0011's note on why the column is NOT NULL DEFAULT ”).
type NewMemberFeedbackInput struct {
	MemberID     string
	TenantID     string
	ContextType  string
	ContextRefID string
	ReasonCode   string
	FreeText     string
}

// CreateMemberFeedback records feedback exactly once per (member, context_type,
// context_ref_id) — a double-submit (identical context) returns the existing row with
// alreadyProcessed=true instead of erroring or creating a duplicate.
func (s *Store) CreateMemberFeedback(ctx context.Context, in NewMemberFeedbackInput) (feedback *models.MemberFeedback, alreadyProcessed bool, err error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO member_feedback (member_id, tenant_id, context_type, context_ref_id, reason_code, free_text)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (member_id, context_type, context_ref_id) DO NOTHING
		RETURNING `+memberFeedbackSelectColumns,
		in.MemberID, in.TenantID, in.ContextType, in.ContextRefID, nullIfEmpty(in.ReasonCode), nullIfEmpty(in.FreeText))

	f, err := scanMemberFeedback(row)
	if errors.Is(err, ErrNotFound) {
		// ON CONFLICT DO NOTHING produced no row: this exact feedback already exists.
		existing, getErr := s.getMemberFeedbackByContext(ctx, in.MemberID, in.ContextType, in.ContextRefID)
		if getErr != nil {
			return nil, false, getErr
		}
		return existing, true, nil
	}
	if err != nil {
		return nil, false, err
	}
	return f, false, nil
}

func (s *Store) getMemberFeedbackByContext(ctx context.Context, memberID, contextType, contextRefID string) (*models.MemberFeedback, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT `+memberFeedbackSelectColumns+`
		FROM member_feedback WHERE member_id = $1 AND context_type = $2 AND context_ref_id = $3`,
		memberID, contextType, contextRefID)
	return scanMemberFeedback(row)
}

func scanMemberFeedback(row rowScanner) (*models.MemberFeedback, error) {
	var f models.MemberFeedback
	err := row.Scan(&f.ID, &f.MemberID, &f.TenantID, &f.ContextType, &f.ContextRefID, &f.ReasonCode, &f.FreeText, &f.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan member_feedback: %w", err)
	}
	return &f, nil
}

// CanContact is the SINGLE source of truth for "may we contact this member right now, for
// this purpose". It never check-then-inserts as two steps — the INSERT ... ON CONFLICT DO
// NOTHING RETURNING id below IS the decision: a returned id means this is the first contact
// today for this purpose (go ahead and contact, the log entry is already written); no row
// means either already contacted today, or the member opted out.
func (s *Store) CanContact(ctx context.Context, memberID, purpose string) (bool, error) {
	var optOut bool
	if err := s.pool.QueryRow(ctx, `SELECT contact_opt_out FROM members WHERE id = $1`, memberID).Scan(&optOut); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, ErrNotFound
		}
		return false, fmt.Errorf("check contact_opt_out: %w", err)
	}
	if optOut {
		return false, nil
	}

	var logID string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO customer_contact_log (member_id, purpose, date_bucket)
		VALUES ($1, $2, CURRENT_DATE)
		ON CONFLICT (member_id, purpose, date_bucket) DO NOTHING
		RETURNING id::text`, memberID, purpose).Scan(&logID)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil // already contacted today for this purpose
	}
	if err != nil {
		return false, fmt.Errorf("record contact log: %w", err)
	}
	return true, nil
}

// CreateSupportTicket escalates to a human. At most one OPEN ticket exists per (member,
// tenant) — enforced by a partial unique index (migration 0011), not a check-then-insert:
// calling this twice while a ticket is still OPEN returns the existing ticket with
// alreadyProcessed=true instead of creating a second one.
func (s *Store) CreateSupportTicket(ctx context.Context, memberID, tenantID, issue string) (ticket *models.SupportTicket, alreadyProcessed bool, err error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO support_tickets (member_id, tenant_id, issue)
		VALUES ($1, $2, $3)
		ON CONFLICT (member_id, tenant_id) WHERE status = 'OPEN' DO NOTHING
		RETURNING id::text, member_id, tenant_id, issue, status, created_at::text, resolved_at::text`,
		memberID, tenantID, issue)

	t, err := scanSupportTicket(row)
	if errors.Is(err, ErrNotFound) {
		existing, getErr := s.getOpenSupportTicket(ctx, memberID, tenantID)
		if getErr != nil {
			return nil, false, getErr
		}
		return existing, true, nil
	}
	if err != nil {
		return nil, false, err
	}
	return t, false, nil
}

func (s *Store) getOpenSupportTicket(ctx context.Context, memberID, tenantID string) (*models.SupportTicket, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id::text, member_id, tenant_id, issue, status, created_at::text, resolved_at::text
		FROM support_tickets WHERE member_id = $1 AND tenant_id = $2 AND status = 'OPEN'`,
		memberID, tenantID)
	return scanSupportTicket(row)
}

func scanSupportTicket(row rowScanner) (*models.SupportTicket, error) {
	var t models.SupportTicket
	var resolvedAt *string
	err := row.Scan(&t.ID, &t.MemberID, &t.TenantID, &t.Issue, &t.Status, &t.CreatedAt, &resolvedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan support_ticket: %w", err)
	}
	t.ResolvedAt = resolvedAt
	return &t, nil
}

// RunPaymentReminderBatch processes one batch of still-PENDING transactions needing a
// reminder: SELECT ... FOR UPDATE SKIP LOCKED means two workers running this concurrently
// naturally partition the work instead of double-reminding the same transaction at the same
// attempt_number. A transaction that's already hit maxAttempts reminders gets an escalation
// support ticket instead of a 4th reminder (idempotent — see CreateSupportTicket).
func (s *Store) RunPaymentReminderBatch(ctx context.Context, maxAttempts, batchLimit int) (remindersSent, ticketsCreated int, err error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT trx_id, tenant_id, member_id FROM transactions
		WHERE status = 'PENDING'
		ORDER BY created_at
		FOR UPDATE SKIP LOCKED
		LIMIT $1`, batchLimit)
	if err != nil {
		return 0, 0, fmt.Errorf("select pending transactions: %w", err)
	}
	type candidate struct{ TrxID, TenantID, MemberID string }
	var candidates []candidate
	for rows.Next() {
		var c candidate
		if err := rows.Scan(&c.TrxID, &c.TenantID, &c.MemberID); err != nil {
			rows.Close()
			return 0, 0, fmt.Errorf("scan candidate: %w", err)
		}
		candidates = append(candidates, c)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, 0, err
	}

	for _, c := range candidates {
		var attemptCount int
		if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM payment_reminders WHERE transaction_id = $1`, c.TrxID).
			Scan(&attemptCount); err != nil {
			return 0, 0, fmt.Errorf("count reminders for %s: %w", c.TrxID, err)
		}

		if attemptCount >= maxAttempts {
			var ticketID string
			issue := fmt.Sprintf("Pembayaran transaksi %s belum lunas setelah %d kali pengingat.", c.TrxID, maxAttempts)
			err := tx.QueryRow(ctx, `
				INSERT INTO support_tickets (member_id, tenant_id, issue)
				VALUES ($1, $2, $3)
				ON CONFLICT (member_id, tenant_id) WHERE status = 'OPEN' DO NOTHING
				RETURNING id::text`, c.MemberID, c.TenantID, issue).Scan(&ticketID)
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return 0, 0, fmt.Errorf("create escalation ticket for %s: %w", c.TrxID, err)
			}
			if ticketID != "" {
				ticketsCreated++
			}
			continue
		}

		nextAttempt := attemptCount + 1
		tag, err := tx.Exec(ctx, `
			INSERT INTO payment_reminders (transaction_id, attempt_number) VALUES ($1, $2)
			ON CONFLICT (transaction_id, attempt_number) DO NOTHING`, c.TrxID, nextAttempt)
		if err != nil {
			return 0, 0, fmt.Errorf("record reminder for %s: %w", c.TrxID, err)
		}
		if tag.RowsAffected() > 0 {
			remindersSent++
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, fmt.Errorf("commit tx: %w", err)
	}
	return remindersSent, ticketsCreated, nil
}
