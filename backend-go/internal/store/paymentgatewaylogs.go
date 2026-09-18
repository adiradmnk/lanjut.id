package store

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"lanjut/backend/internal/models"
)

// CreatePaymentGatewayLog records one REQUEST/RESPONSE/WEBHOOK audit entry (FASE 1b).
// Additive only — never touches transactions or any existing flow. rawPayload must already
// be redacted by the caller (the adapter) before it ever reaches here; this function does
// not (and must not) attempt redaction itself, since by then the sensitive value would
// already have been written to whatever the caller built rawPayload from.
func (s *Store) CreatePaymentGatewayLog(ctx context.Context, transactionID *string, provider, direction string, rawPayload json.RawMessage) error {
	if len(rawPayload) == 0 {
		rawPayload = json.RawMessage("{}")
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO payment_gateway_logs (transaction_id, provider, direction, raw_payload)
		VALUES ($1, $2, $3, $4)`,
		transactionID, provider, direction, rawPayload)
	return err
}

// TransactionFilter narrows ListTransactionsByTenant. Zero values mean "no filter" for that
// field.
type TransactionFilter struct {
	MemberID string
	Status   string
	From     *time.Time
	To       *time.Time
}

// ListTransactionsByTenant is the merchant-facing dashboard/reconciliation view (FASE 1b):
// full transaction records for a tenant, optionally filtered. Signature is intentionally
// NOT redacted at this layer (that's the handler's job when building the JSON response,
// same "redact where it's about to be exposed" principle) — this function returns the
// existing models.Transaction shape as-is, matching store.GetTransaction's convention.
func (s *Store) ListTransactionsByTenant(ctx context.Context, tenantID string, filter TransactionFilter) ([]models.Transaction, error) {
	query := `SELECT ` + transactionSelectColumns + ` FROM transactions WHERE tenant_id = $1`
	args := []any{tenantID}

	if filter.MemberID != "" {
		args = append(args, filter.MemberID)
		query += fmt.Sprintf(" AND member_id = $%d", len(args))
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		query += fmt.Sprintf(" AND status = $%d", len(args))
	}
	if filter.From != nil {
		args = append(args, *filter.From)
		query += fmt.Sprintf(" AND created_at >= $%d", len(args))
	}
	if filter.To != nil {
		args = append(args, *filter.To)
		query += fmt.Sprintf(" AND created_at <= $%d", len(args))
	}
	query += " ORDER BY created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Transaction
	for rows.Next() {
		t, err := scanTransaction(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *t)
	}
	return out, rows.Err()
}

// ListTenantTransactionFeedForAI is the PII-stripped view exposed to the AI sidecar (FASE
// 1b): no name/email/phone/virtualAccountNo/signature/raw_payload, ever — see
// models.AITransactionFeedItem's doc comment for the exact contract.
func (s *Store) ListTenantTransactionFeedForAI(ctx context.Context, tenantID string, since *time.Time) ([]models.AITransactionFeedItem, error) {
	query := `
		SELECT t.member_id, COALESCE(cs.time_of_day, 'GENERAL'), t.amount, t.status,
		       COALESCE(pp.billing_type, 'ONE_TIME'), t.paid_at::text, t.created_at::text
		FROM transactions t
		LEFT JOIN class_sessions cs ON cs.id = t.session_id
		LEFT JOIN ai_offers ao ON ao.id = t.ai_offer_id
		LEFT JOIN product_packages pp ON pp.id = ao.based_on_package_id
		WHERE t.tenant_id = $1`
	args := []any{tenantID}
	if since != nil {
		args = append(args, *since)
		query += fmt.Sprintf(" AND t.created_at >= $%d", len(args))
	}
	query += " ORDER BY t.created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.AITransactionFeedItem
	for rows.Next() {
		var item models.AITransactionFeedItem
		var paidAt *string
		if err := rows.Scan(&item.MemberRef, &item.SessionCategory, &item.Amount, &item.Status,
			&item.BillingType, &paidAt, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan ai transaction feed item: %w", err)
		}
		item.PaidAt = paidAt
		out = append(out, item)
	}
	return out, rows.Err()
}

// ListPaymentGatewayLogsByTransaction returns every REQUEST/RESPONSE/WEBHOOK log entry
// recorded for a transaction, oldest first — useful for reconciliation.
func (s *Store) ListPaymentGatewayLogsByTransaction(ctx context.Context, trxID string) ([]models.PaymentGatewayLog, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, transaction_id, provider, direction, raw_payload::text, created_at::text
		FROM payment_gateway_logs WHERE transaction_id = $1 ORDER BY created_at ASC`, trxID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.PaymentGatewayLog
	for rows.Next() {
		var l models.PaymentGatewayLog
		var rawPayload string
		if err := rows.Scan(&l.ID, &l.TransactionID, &l.Provider, &l.Direction, &rawPayload, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan payment_gateway_log: %w", err)
		}
		l.RawPayload = json.RawMessage(rawPayload)
		out = append(out, l)
	}
	return out, rows.Err()
}

// ListAllPaymentGatewayLogs returns the most recent audit logs across all transactions
func (s *Store) ListAllPaymentGatewayLogs(ctx context.Context, limit int) ([]models.PaymentGatewayLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id::text, transaction_id, provider, direction, raw_payload::text, created_at::text
		FROM payment_gateway_logs ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.PaymentGatewayLog
	for rows.Next() {
		var l models.PaymentGatewayLog
		var rawPayload string
		if err := rows.Scan(&l.ID, &l.TransactionID, &l.Provider, &l.Direction, &rawPayload, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan payment_gateway_log: %w", err)
		}
		l.RawPayload = json.RawMessage(rawPayload)
		out = append(out, l)
	}
	return out, rows.Err()
}

