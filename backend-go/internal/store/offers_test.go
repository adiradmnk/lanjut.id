package store

import (
	"context"
	"fmt"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"lanjut/backend/internal/db"
	"lanjut/backend/internal/models"
)

// newTestStore connects to TEST_DATABASE_URL and runs migrations. Tests using it are
// skipped (not failed) when that env var isn't set, so `go test ./...` stays green in
// environments without a Postgres available.
func newTestStore(t *testing.T) *Store {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping store integration test")
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(pool.Close)

	if err := db.Migrate(ctx, pool); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	return New(pool)
}

// seedFixture inserts a throwaway tenant/member/session triplet scoped to this test run
// (unique IDs derived from t.Name()), so concurrency tests don't collide with each other or
// with the seed data from migration 0002.
type fixture struct {
	tenantID  string
	memberID  string
	sessionID string
}

func seedFixture(t *testing.T, pool *pgxpool.Pool, totalCapacity, bookedSlots int) fixture {
	t.Helper()
	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())

	f := fixture{
		tenantID:  "test-tenant-" + suffix,
		memberID:  "test-member-" + suffix,
		sessionID: "test-session-" + suffix,
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO tenants (id, business_name, max_discount_pct, min_margin_floor_idr)
		VALUES ($1, 'Test Tenant', 15, 50000)`, f.tenantID)
	if err != nil {
		t.Fatalf("seed tenant: %v", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO members (id, tenant_id, name, total_quota, used_quota)
		VALUES ($1, $2, 'Test Member', 8, 0)`, f.memberID, f.tenantID)
	if err != nil {
		t.Fatalf("seed member: %v", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO class_sessions (id, tenant_id, title, total_capacity, booked_slots, price_per_session_idr)
		VALUES ($1, $2, 'Test Session', $3, $4, 150000)`, f.sessionID, f.tenantID, totalCapacity, bookedSlots)
	if err != nil {
		t.Fatalf("seed session: %v", err)
	}

	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM reservations WHERE session_id = $1`, f.sessionID)
		_, _ = pool.Exec(ctx, `DELETE FROM ai_offers WHERE tenant_id = $1`, f.tenantID)
		_, _ = pool.Exec(ctx, `DELETE FROM class_sessions WHERE id = $1`, f.sessionID)
		_, _ = pool.Exec(ctx, `DELETE FROM members WHERE id = $1`, f.memberID)
		_, _ = pool.Exec(ctx, `DELETE FROM tenants WHERE id = $1`, f.tenantID)
	})

	return f
}

func newOffer(f fixture, priceIDR float64) models.AIOffer {
	sessionID := f.sessionID
	return models.AIOffer{
		TenantID:        f.tenantID,
		MemberID:        f.memberID,
		Source:          "AI_GENERATED",
		TargetSessionID: &sessionID,
		ProposedTitle:   "Test Offer",
		PriceIDR:        priceIDR,
		DiscountPct:     10,
	}
}

// Edge case: two concurrent generate-offers calls both targeting a session with exactly one
// free slot must not both succeed — only one may hold the last seat.
func TestCreateOfferWithReservation_LastSlotRace(t *testing.T) {
	s := newTestStore(t)
	f := seedFixture(t, s.pool, 5, 4) // 1 slot free

	const attempts = 5
	var successes, slotFullCount int64
	var wg sync.WaitGroup
	wg.Add(attempts)

	for i := 0; i < attempts; i++ {
		go func() {
			defer wg.Done()
			_, reservation, err := s.CreateOfferWithReservation(context.Background(), newOffer(f, 100000), time.Now().Add(time.Hour), 15*time.Minute)
			switch {
			case err == nil && reservation != nil:
				atomic.AddInt64(&successes, 1)
			case err == ErrSlotFull:
				atomic.AddInt64(&slotFullCount, 1)
			case err != nil:
				t.Errorf("unexpected error: %v", err)
			}
		}()
	}
	wg.Wait()

	if successes != 1 {
		t.Fatalf("expected exactly 1 successful reservation for the last slot, got %d (slot_full=%d)", successes, slotFullCount)
	}
	if slotFullCount != attempts-1 {
		t.Fatalf("expected %d ErrSlotFull responses, got %d", attempts-1, slotFullCount)
	}
}

// Edge case: two concurrent approve calls on the same offer must transition it exactly
// once; the loser gets alreadyProcessed=true, and the reservation is confirmed exactly once
// (not double-confirmed).
func TestApproveOffer_ConcurrentDoubleApproveIsIdempotent(t *testing.T) {
	s := newTestStore(t)
	f := seedFixture(t, s.pool, 10, 0)

	offer, reservation, err := s.CreateOfferWithReservation(context.Background(), newOffer(f, 100000), time.Now().Add(time.Hour), 15*time.Minute)
	if err != nil {
		t.Fatalf("create offer: %v", err)
	}
	if reservation == nil {
		t.Fatal("expected a reservation to be created")
	}

	const attempts = 5
	var approvedCount, alreadyProcessedCount int64
	var wg sync.WaitGroup
	wg.Add(attempts)

	for i := 0; i < attempts; i++ {
		go func() {
			defer wg.Done()
			_, alreadyProcessed, err := s.ApproveOffer(context.Background(), f.tenantID, offer.ID, "staff-1")
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if alreadyProcessed {
				atomic.AddInt64(&alreadyProcessedCount, 1)
			} else {
				atomic.AddInt64(&approvedCount, 1)
			}
		}()
	}
	wg.Wait()

	if approvedCount != 1 {
		t.Fatalf("expected exactly 1 call to actually approve, got %d", approvedCount)
	}
	if alreadyProcessedCount != attempts-1 {
		t.Fatalf("expected %d ALREADY_PROCESSED responses, got %d", attempts-1, alreadyProcessedCount)
	}

	final, err := s.GetAIOffer(context.Background(), offer.ID)
	if err != nil {
		t.Fatalf("get offer: %v", err)
	}
	if final.Status != "MERCHANT_APPROVED" {
		t.Fatalf("expected status MERCHANT_APPROVED, got %s", final.Status)
	}

	var confirmedCount int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM reservations WHERE ai_offer_id = $1 AND status = 'CONFIRMED'`, offer.ID).Scan(&confirmedCount); err != nil {
		t.Fatalf("count confirmed reservations: %v", err)
	}
	if confirmedCount != 1 {
		t.Fatalf("expected exactly 1 CONFIRMED reservation, got %d (double-confirm bug)", confirmedCount)
	}
}

// Edge case: approving an offer whose AI_SUGGESTED window has already lapsed must be
// rejected clearly (ErrOfferExpired), not silently treated as still valid.
func TestApproveOffer_PastExpiryIsRejected(t *testing.T) {
	s := newTestStore(t)
	f := seedFixture(t, s.pool, 10, 0)

	offer, _, err := s.CreateOfferWithReservation(context.Background(), newOffer(f, 100000), time.Now().Add(-time.Minute), 15*time.Minute)
	if err != nil {
		t.Fatalf("create offer: %v", err)
	}

	_, _, err = s.ApproveOffer(context.Background(), f.tenantID, offer.ID, "staff-1")
	if err != ErrOfferExpired {
		t.Fatalf("expected ErrOfferExpired, got %v", err)
	}

	final, err := s.GetAIOffer(context.Background(), offer.ID)
	if err != nil {
		t.Fatalf("get offer: %v", err)
	}
	if final.Status != "EXPIRED" {
		t.Fatalf("expected offer to be lazily flipped to EXPIRED, got %s", final.Status)
	}
}

// Edge case: a HELD reservation whose held_until has passed no longer blocks the slot for a
// subsequent generate-offers call — it's lazily treated as expired at check time, no cron
// job needed.
func TestCreateOfferWithReservation_ExpiredHoldFreesSlot(t *testing.T) {
	s := newTestStore(t)
	f := seedFixture(t, s.pool, 1, 0) // exactly 1 slot total

	// First reservation holds the only slot, but its hold window is already in the past.
	_, reservation1, err := s.CreateOfferWithReservation(context.Background(), newOffer(f, 100000), time.Now().Add(time.Hour), -time.Minute)
	if err != nil {
		t.Fatalf("create first offer: %v", err)
	}
	if reservation1 == nil {
		t.Fatal("expected first reservation to be created")
	}

	// Second call should see the first HELD reservation as stale and succeed.
	_, reservation2, err := s.CreateOfferWithReservation(context.Background(), newOffer(f, 100000), time.Now().Add(time.Hour), 15*time.Minute)
	if err != nil {
		t.Fatalf("expected second reservation to succeed after first expired, got err: %v", err)
	}
	if reservation2 == nil {
		t.Fatal("expected second reservation to be created")
	}
}

// Edge case: rejecting an offer releases its HELD reservation back to the pool.
func TestRejectOffer_ReleasesReservation(t *testing.T) {
	s := newTestStore(t)
	f := seedFixture(t, s.pool, 10, 0)

	offer, reservation, err := s.CreateOfferWithReservation(context.Background(), newOffer(f, 100000), time.Now().Add(time.Hour), 15*time.Minute)
	if err != nil {
		t.Fatalf("create offer: %v", err)
	}
	if reservation == nil {
		t.Fatal("expected a reservation to be created")
	}

	updated, alreadyProcessed, err := s.RejectOffer(context.Background(), f.tenantID, offer.ID, "customer asked to cancel")
	if err != nil {
		t.Fatalf("reject offer: %v", err)
	}
	if alreadyProcessed {
		t.Fatal("expected first reject to actually process, not ALREADY_PROCESSED")
	}
	if updated.Status != "MERCHANT_REJECTED" {
		t.Fatalf("expected status MERCHANT_REJECTED, got %s", updated.Status)
	}
	if updated.RejectionReason != "customer asked to cancel" {
		t.Fatalf("expected rejection reason to be stored, got %q", updated.RejectionReason)
	}

	var releasedCount int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM reservations WHERE ai_offer_id = $1 AND status = 'RELEASED'`, offer.ID).Scan(&releasedCount); err != nil {
		t.Fatalf("count released reservations: %v", err)
	}
	if releasedCount != 1 {
		t.Fatalf("expected reservation to be released, got %d released rows", releasedCount)
	}

	// A second reject on the already-terminal offer must be idempotent.
	_, alreadyProcessed2, err := s.RejectOffer(context.Background(), f.tenantID, offer.ID, "second attempt")
	if err != nil {
		t.Fatalf("second reject: %v", err)
	}
	if !alreadyProcessed2 {
		t.Fatal("expected second reject on already-rejected offer to be ALREADY_PROCESSED")
	}
}
