package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

const invoiceSelectColumns = `
	id::text, invoice_number, trx_id, tenant_id, member_id, ai_offer_id::text, item_title,
	amount_idr, customer_name, COALESCE(customer_email, ''), merchant_name,
	COALESCE(bni_va_number, ''), issued_at::text, paid_at::text`

// NewInvoiceInput is what CreateInvoice needs to issue a receipt for a settled transaction.
type NewInvoiceInput struct {
	InvoiceNumber string
	TrxID         string
	TenantID      string
	MemberID      string
	AIOfferID     *string
	ItemTitle     string
	AmountIDR     float64
	CustomerName  string
	CustomerEmail string
	MerchantName  string
	VANumber      string
	PaidAt        time.Time
}

// CreateInvoice issues an invoice for a settled transaction. Idempotent on trx_id: calling
// it twice for the same transaction never creates a duplicate — it just returns the
// invoice created the first time.
func (s *Store) CreateInvoice(ctx context.Context, in NewInvoiceInput) (*models.Invoice, error) {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO invoices (invoice_number, trx_id, tenant_id, member_id, ai_offer_id, item_title,
		                      amount_idr, customer_name, customer_email, merchant_name, bni_va_number, paid_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (trx_id) DO NOTHING`,
		in.InvoiceNumber, in.TrxID, in.TenantID, in.MemberID, in.AIOfferID, in.ItemTitle,
		in.AmountIDR, in.CustomerName, in.CustomerEmail, in.MerchantName, in.VANumber, in.PaidAt)
	if err != nil {
		return nil, fmt.Errorf("insert invoice: %w", err)
	}
	return s.GetInvoiceByTrxID(ctx, in.TrxID)
}

// GetInvoiceByTrxID looks up the invoice for a given transaction, if one has been issued.
func (s *Store) GetInvoiceByTrxID(ctx context.Context, trxID string) (*models.Invoice, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+invoiceSelectColumns+` FROM invoices WHERE trx_id = $1`, trxID)
	return scanInvoice(row)
}

// ListInvoicesByMember returns every invoice ever issued to a member, newest first.
func (s *Store) ListInvoicesByMember(ctx context.Context, memberID string) ([]models.Invoice, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+invoiceSelectColumns+`
		FROM invoices WHERE member_id = $1 ORDER BY issued_at DESC`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.Invoice
	for rows.Next() {
		inv, err := scanInvoice(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *inv)
	}
	return out, rows.Err()
}

func scanInvoice(row rowScanner) (*models.Invoice, error) {
	var inv models.Invoice
	err := row.Scan(&inv.ID, &inv.InvoiceNumber, &inv.TrxID, &inv.TenantID, &inv.MemberID, &inv.AIOfferID,
		&inv.ItemTitle, &inv.AmountIDR, &inv.CustomerName, &inv.CustomerEmail, &inv.MerchantName,
		&inv.VANumber, &inv.IssuedAt, &inv.PaidAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan invoice: %w", err)
	}
	return &inv, nil
}
