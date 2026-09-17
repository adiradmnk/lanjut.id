package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

// ErrSlotFull means the session's remaining capacity (after subtracting already-booked
// slots and any other active reservation) is zero at the moment of the check.
var ErrSlotFull = errors.New("slot full")

// CreateOfferWithReservation inserts an ai_offers row and, if it targets a session, a HELD
// reservations row in the same transaction, guarded by a `SELECT ... FOR UPDATE` lock on the
// class_sessions row. This is what prevents two concurrent generate-offers calls from both
// grabbing the last seat: the loser gets ErrSlotFull instead of an oversold reservation.
//
// Any HELD reservation on the session whose held_until has already passed is lazily flipped
// to EXPIRED (and excluded from the capacity count) as part of this same check — there is no
// separate cron job for this in the MVP.
func (s *Store) CreateOfferWithReservation(ctx context.Context, offer models.AIOffer, expiresAt time.Time, holdFor time.Duration) (*models.AIOffer, *models.Reservation, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if offer.TargetSessionID != nil {
		var totalCapacity, bookedSlots int
		err := tx.QueryRow(ctx, `
			SELECT total_capacity, booked_slots FROM class_sessions WHERE id = $1 FOR UPDATE`,
			*offer.TargetSessionID).Scan(&totalCapacity, &bookedSlots)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrNotFound
		}
		if err != nil {
			return nil, nil, fmt.Errorf("lock session: %w", err)
		}

		if _, err := tx.Exec(ctx, `
			UPDATE reservations SET status = 'EXPIRED'
			WHERE session_id = $1 AND status = 'HELD' AND held_until <= now()`,
			*offer.TargetSessionID); err != nil {
			return nil, nil, fmt.Errorf("expire stale reservations: %w", err)
		}

		var activeHolds int
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*) FROM reservations WHERE session_id = $1 AND status IN ('HELD', 'CONFIRMED')`,
			*offer.TargetSessionID).Scan(&activeHolds); err != nil {
			return nil, nil, fmt.Errorf("count active reservations: %w", err)
		}

		available := totalCapacity - bookedSlots - activeHolds
		if available <= 0 {
			return nil, nil, ErrSlotFull
		}
	}

	offerRow := tx.QueryRow(ctx, `
		INSERT INTO ai_offers (tenant_id, member_id, source, based_on_package_id, target_session_id,
		                       proposed_title, price_idr, discount_pct, projected_margin_idr, status, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'AI_SUGGESTED', $10)
		RETURNING id::text, tenant_id, member_id, source, based_on_package_id::text, target_session_id,
		          proposed_title, terms_snapshot::text, price_idr, discount_pct, projected_margin_idr,
		          status, COALESCE(rejection_reason, ''), COALESCE(approved_by, ''), approved_at::text,
		          expires_at::text, created_at::text`,
		offer.TenantID, offer.MemberID, offer.Source, offer.BasedOnPackageID, offer.TargetSessionID,
		offer.ProposedTitle, offer.PriceIDR, offer.DiscountPct, offer.ProjectedMarginIDR, expiresAt)

	created, err := scanAIOffer(offerRow)
	if err != nil {
		return nil, nil, fmt.Errorf("insert ai_offer: %w", err)
	}

	var reservation *models.Reservation
	if offer.TargetSessionID != nil {
		heldUntil := time.Now().Add(holdFor)
		reservationRow := tx.QueryRow(ctx, `
			INSERT INTO reservations (ai_offer_id, session_id, member_id, status, held_until)
			VALUES ($1, $2, $3, 'HELD', $4)
			RETURNING id::text, ai_offer_id::text, session_id, member_id, status, held_until::text, created_at::text`,
			created.ID, *offer.TargetSessionID, offer.MemberID, heldUntil)

		reservation, err = scanReservation(reservationRow)
		if err != nil {
			return nil, nil, fmt.Errorf("insert reservation: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("commit tx: %w", err)
	}
	return created, reservation, nil
}

// ReleaseReservationForOffer frees any HELD or CONFIRMED reservation tied to an offer.
// Called when a merchant rejects the offer, and when its transaction settles (at which
// point class_sessions.booked_slots becomes the source of truth for that seat instead).
func (s *Store) ReleaseReservationForOffer(ctx context.Context, offerID string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE reservations SET status = 'RELEASED'
		WHERE ai_offer_id = $1 AND status IN ('HELD', 'CONFIRMED')`, offerID)
	return err
}

func scanReservation(row rowScanner) (*models.Reservation, error) {
	var r models.Reservation
	err := row.Scan(&r.ID, &r.AIOfferID, &r.SessionID, &r.MemberID, &r.Status, &r.HeldUntil, &r.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan reservation: %w", err)
	}
	return &r, nil
}
