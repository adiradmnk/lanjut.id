package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

// ErrOfferExpired means the offer was still AI_SUGGESTED but past its expires_at when a
// merchant tried to approve/reject it; it has just been lazily flipped to EXPIRED.
var ErrOfferExpired = errors.New("offer expired")

const aiOfferSelectColumns = `
	id::text, tenant_id, member_id, source, based_on_package_id::text, target_session_id,
	proposed_title, terms_snapshot::text, price_idr, discount_pct, projected_margin_idr,
	status, COALESCE(rejection_reason, ''), COALESCE(approved_by, ''), approved_at::text,
	expires_at::text, created_at::text`

// GetAIOffer looks up a single ai_offers row by id, regardless of status.
func (s *Store) GetAIOffer(ctx context.Context, id string) (*models.AIOffer, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+aiOfferSelectColumns+` FROM ai_offers WHERE id = $1`, id)
	return scanAIOffer(row)
}

// expireStaleOffers is the lazy-expiry sweep for the AI_SUGGESTED queue: any offer whose
// expires_at has passed is flipped to EXPIRED before the caller reads the queue. There is
// no separate cron job for this in the MVP.
func (s *Store) expireStaleOffers(ctx context.Context, tenantID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE ai_offers SET status = 'EXPIRED'
		WHERE tenant_id = $1 AND status = 'AI_SUGGESTED' AND expires_at IS NOT NULL AND expires_at <= now()`,
		tenantID)
	return err
}

// ListPendingOffers is the merchant approval queue.
func (s *Store) ListPendingOffers(ctx context.Context, tenantID string) ([]models.AIOffer, error) {
	if err := s.expireStaleOffers(ctx, tenantID); err != nil {
		return nil, fmt.Errorf("expire stale offers: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT `+aiOfferSelectColumns+`
		FROM ai_offers WHERE tenant_id = $1 AND status = 'AI_SUGGESTED' ORDER BY created_at DESC`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.AIOffer
	for rows.Next() {
		o, err := scanAIOffer(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *o)
	}
	return out, rows.Err()
}

// ListApprovedOffersForMember is what the customer-facing magic-token portal shows: only
// offers a human has already approved, and only while they haven't expired.
func (s *Store) ListApprovedOffersForMember(ctx context.Context, memberID string) ([]models.AIOffer, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+aiOfferSelectColumns+`
		FROM ai_offers
		WHERE member_id = $1 AND status = 'MERCHANT_APPROVED' AND (expires_at IS NULL OR expires_at > now())
		ORDER BY approved_at DESC`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.AIOffer
	for rows.Next() {
		o, err := scanAIOffer(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *o)
	}
	return out, rows.Err()
}

// lockOfferAndHandleExpiry locks the ai_offers row FOR UPDATE inside tx and lazily flips it
// to EXPIRED if its AI_SUGGESTED window has passed. Returns the (possibly just-updated)
// status so the caller can decide how to proceed.
func lockOfferAndHandleExpiry(ctx context.Context, tx pgx.Tx, tenantID, offerID string) (string, error) {
	var status string
	var expiresAt *time.Time
	err := tx.QueryRow(ctx, `
		SELECT status, expires_at FROM ai_offers WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
		offerID, tenantID).Scan(&status, &expiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("lock ai_offer: %w", err)
	}

	if status == "AI_SUGGESTED" && expiresAt != nil && !expiresAt.After(time.Now()) {
		if _, err := tx.Exec(ctx, `UPDATE ai_offers SET status = 'EXPIRED' WHERE id = $1`, offerID); err != nil {
			return "", fmt.Errorf("expire ai_offer: %w", err)
		}
		return "EXPIRED", nil
	}
	return status, nil
}

func getAIOfferTx(ctx context.Context, tx pgx.Tx, id string) (*models.AIOffer, error) {
	row := tx.QueryRow(ctx, `SELECT `+aiOfferSelectColumns+` FROM ai_offers WHERE id = $1`, id)
	return scanAIOffer(row)
}

// ApproveOffer transitions AI_SUGGESTED -> MERCHANT_APPROVED exactly once, and confirms any
// HELD reservation tied to the offer. It is idempotent: a second concurrent (or later) call
// sees a non-AI_SUGGESTED status and returns alreadyProcessed=true instead of erroring or
// double-confirming the reservation. Approving an offer whose window has already lapsed
// returns ErrOfferExpired instead.
//
// The terms_snapshot is built from data read from inside this same locked transaction
// (the offer's own row plus the tenant's current constraint), not from a read taken before
// the lock, so it's atomic with the approval itself rather than a moment-earlier snapshot.
func (s *Store) ApproveOffer(ctx context.Context, tenantID, offerID, approvedBy string) (offer *models.AIOffer, alreadyProcessed bool, err error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	status, err := lockOfferAndHandleExpiry(ctx, tx, tenantID, offerID)
	if err != nil {
		return nil, false, err
	}

	if status == "EXPIRED" {
		if err := tx.Commit(ctx); err != nil {
			return nil, false, err
		}
		return nil, false, ErrOfferExpired
	}

	if status != "AI_SUGGESTED" {
		o, err := getAIOfferTx(ctx, tx, offerID)
		if err != nil {
			return nil, false, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, false, err
		}
		return o, true, nil
	}

	current, err := getAIOfferTx(ctx, tx, offerID)
	if err != nil {
		return nil, false, fmt.Errorf("read current offer: %w", err)
	}

	var maxDiscountPct, minMarginFloorIDR float64
	if err := tx.QueryRow(ctx, `
		SELECT max_discount_pct, min_margin_floor_idr FROM tenants WHERE id = $1`, tenantID).
		Scan(&maxDiscountPct, &minMarginFloorIDR); err != nil {
		return nil, false, fmt.Errorf("read tenant constraint: %w", err)
	}

	termsSnapshot, err := json.Marshal(map[string]any{
		"proposed_title":              current.ProposedTitle,
		"price_idr":                   current.PriceIDR,
		"discount_pct":                current.DiscountPct,
		"projected_margin_idr":        current.ProjectedMarginIDR,
		"tenant_max_discount_pct":     maxDiscountPct,
		"tenant_min_margin_floor_idr": minMarginFloorIDR,
		"approved_by":                 approvedBy,
	})
	if err != nil {
		return nil, false, fmt.Errorf("build terms snapshot: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE ai_offers
		SET status = 'MERCHANT_APPROVED', approved_by = $2, approved_at = now(), terms_snapshot = $3
		WHERE id = $1`, offerID, approvedBy, termsSnapshot); err != nil {
		return nil, false, fmt.Errorf("approve ai_offer: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE reservations SET status = 'CONFIRMED' WHERE ai_offer_id = $1 AND status = 'HELD'`,
		offerID); err != nil {
		return nil, false, fmt.Errorf("confirm reservation: %w", err)
	}

	o, err := getAIOfferTx(ctx, tx, offerID)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit tx: %w", err)
	}
	return o, false, nil
}

// RejectOffer transitions AI_SUGGESTED -> MERCHANT_REJECTED exactly once, releasing any
// HELD reservation tied to the offer. Idempotent and expiry-aware in the same way as
// ApproveOffer.
func (s *Store) RejectOffer(ctx context.Context, tenantID, offerID, reason string) (offer *models.AIOffer, alreadyProcessed bool, err error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	status, err := lockOfferAndHandleExpiry(ctx, tx, tenantID, offerID)
	if err != nil {
		return nil, false, err
	}

	if status == "EXPIRED" {
		if err := tx.Commit(ctx); err != nil {
			return nil, false, err
		}
		return nil, false, ErrOfferExpired
	}

	if status != "AI_SUGGESTED" {
		o, err := getAIOfferTx(ctx, tx, offerID)
		if err != nil {
			return nil, false, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, false, err
		}
		return o, true, nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE ai_offers SET status = 'MERCHANT_REJECTED', rejection_reason = $2 WHERE id = $1`,
		offerID, reason); err != nil {
		return nil, false, fmt.Errorf("reject ai_offer: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE reservations SET status = 'RELEASED' WHERE ai_offer_id = $1 AND status = 'HELD'`,
		offerID); err != nil {
		return nil, false, fmt.Errorf("release reservation: %w", err)
	}

	o, err := getAIOfferTx(ctx, tx, offerID)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit tx: %w", err)
	}
	return o, false, nil
}

// DeclineOfferByCustomer transitions MERCHANT_APPROVED -> REJECTED_BY_CUSTOMER exactly
// once: the customer changed their mind after the merchant approved but before paying.
// Releases any CONFIRMED reservation tied to the offer. Idempotent, same pattern as
// ApproveOffer/RejectOffer. Scoped to memberID so one member can't decline another
// member's offer even if they guess its id.
func (s *Store) DeclineOfferByCustomer(ctx context.Context, memberID, offerID, reason string) (offer *models.AIOffer, alreadyProcessed bool, err error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, false, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var status, dbMemberID string
	err = tx.QueryRow(ctx, `
		SELECT status, member_id FROM ai_offers WHERE id = $1 FOR UPDATE`, offerID).Scan(&status, &dbMemberID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, ErrNotFound
	}
	if err != nil {
		return nil, false, fmt.Errorf("lock ai_offer: %w", err)
	}
	if dbMemberID != memberID {
		return nil, false, ErrNotFound
	}

	if status != "MERCHANT_APPROVED" {
		o, err := getAIOfferTx(ctx, tx, offerID)
		if err != nil {
			return nil, false, err
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, false, err
		}
		return o, true, nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE ai_offers SET status = 'REJECTED_BY_CUSTOMER', rejection_reason = $2 WHERE id = $1`,
		offerID, reason); err != nil {
		return nil, false, fmt.Errorf("decline ai_offer: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE reservations SET status = 'RELEASED' WHERE ai_offer_id = $1 AND status = 'CONFIRMED'`,
		offerID); err != nil {
		return nil, false, fmt.Errorf("release reservation: %w", err)
	}

	o, err := getAIOfferTx(ctx, tx, offerID)
	if err != nil {
		return nil, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit tx: %w", err)
	}
	return o, false, nil
}

func scanAIOffer(row rowScanner) (*models.AIOffer, error) {
	var o models.AIOffer
	var termsSnapshot *string
	err := row.Scan(&o.ID, &o.TenantID, &o.MemberID, &o.Source, &o.BasedOnPackageID, &o.TargetSessionID,
		&o.ProposedTitle, &termsSnapshot, &o.PriceIDR, &o.DiscountPct, &o.ProjectedMarginIDR,
		&o.Status, &o.RejectionReason, &o.ApprovedBy, &o.ApprovedAt, &o.ExpiresAt, &o.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan ai_offer: %w", err)
	}
	if termsSnapshot != nil {
		o.TermsSnapshot = json.RawMessage(*termsSnapshot)
	}
	return &o, nil
}
