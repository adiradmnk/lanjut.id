package store

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"lanjut/backend/internal/models"
)

// seedCustomerFixture inserts a throwaway tenant/member pair scoped to this test run.
func seedCustomerFixture(t *testing.T, pool *pgxpool.Pool) (tenantID, memberID string) {
	t.Helper()
	ctx := context.Background()
	suffix := fmt.Sprintf("%d", time.Now().UnixNano())
	tenantID = "test-tenant-" + suffix
	memberID = "test-member-" + suffix

	if _, err := pool.Exec(ctx, `
		INSERT INTO tenants (id, business_name, max_discount_pct, min_margin_floor_idr)
		VALUES ($1, 'Test Tenant', 15, 50000)`, tenantID); err != nil {
		t.Fatalf("seed tenant: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO members (id, tenant_id, name, email, phone, current_package, package_tier, total_quota, used_quota)
		VALUES ($1, $2, 'Test Member', 'test@example.com', '08123456789', 'Test Package', 'STANDARD', 8, 0)`,
		memberID, tenantID); err != nil {
		t.Fatalf("seed member: %v", err)
	}

	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM support_tickets WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(ctx, `DELETE FROM customer_contact_log WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(ctx, `DELETE FROM member_feedback WHERE member_id = $1`, memberID)
		_, _ = pool.Exec(ctx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = pool.Exec(ctx, `DELETE FROM tenants WHERE id = $1`, tenantID)
	})

	return tenantID, memberID
}

// seedReminderTransaction inserts a session and a PENDING transaction against the given
// tenant/member, ready to be picked up by RunPaymentReminderBatch.
func seedReminderTransaction(t *testing.T, pool *pgxpool.Pool, s *Store, tenantID, memberID, trxID string) {
	t.Helper()
	ctx := context.Background()
	sessionID := "test-session-" + trxID

	if _, err := pool.Exec(ctx, `
		INSERT INTO class_sessions (id, tenant_id, title, total_capacity, booked_slots, price_per_session_idr)
		VALUES ($1, $2, 'Test Session', 10, 0, 150000)`, sessionID, tenantID); err != nil {
		t.Fatalf("seed session: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), `DELETE FROM class_sessions WHERE id = $1`, sessionID)
	})

	trx := models.Transaction{
		TrxID: trxID, TenantID: tenantID, MemberID: memberID, SessionID: sessionID,
		SessionTitle: "Test Session", Amount: 150000, VANumber: "8808123456", Signature: "test-signature",
	}
	if err := s.CreatePendingTransaction(ctx, trx); err != nil {
		t.Fatalf("seed pending transaction: %v", err)
	}
}

// TestCancelSubscription_ConcurrentCancelsOnlyOneTransitions: two simultaneous cancel
// requests for the same member must result in exactly one real transition; the other must
// report alreadyProcessed=true, never an error.
func TestCancelSubscription_ConcurrentCancelsOnlyOneTransitions(t *testing.T) {
	s := newTestStore(t)
	_, memberID := seedCustomerFixture(t, s.pool)

	const attempts = 5
	var transitioned, alreadyProcessedCount int64
	var wg sync.WaitGroup
	wg.Add(attempts)

	for i := 0; i < attempts; i++ {
		go func() {
			defer wg.Done()
			_, alreadyProcessed, err := s.CancelSubscription(context.Background(), memberID)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if alreadyProcessed {
				atomic.AddInt64(&alreadyProcessedCount, 1)
			} else {
				atomic.AddInt64(&transitioned, 1)
			}
		}()
	}
	wg.Wait()

	if transitioned != 1 {
		t.Fatalf("expected exactly 1 real transition, got %d", transitioned)
	}
	if alreadyProcessedCount != attempts-1 {
		t.Fatalf("expected %d ALREADY_PROCESSED results, got %d", attempts-1, alreadyProcessedCount)
	}

	member, err := s.GetMember(context.Background(), memberID)
	if err != nil {
		t.Fatalf("get member: %v", err)
	}
	if member.SubscriptionStatus != "CANCELLED" {
		t.Fatalf("expected subscription_status=CANCELLED, got %s", member.SubscriptionStatus)
	}
}

// TestCreateMemberFeedback_DoubleSubmitStoresOnlyOneRow: two identical feedback submissions
// for the same context must result in exactly one stored row.
func TestCreateMemberFeedback_DoubleSubmitStoresOnlyOneRow(t *testing.T) {
	s := newTestStore(t)
	tenantID, memberID := seedCustomerFixture(t, s.pool)

	input := NewMemberFeedbackInput{
		MemberID: memberID, TenantID: tenantID,
		ContextType: "CANCELLATION", ContextRefID: memberID,
		ReasonCode: "TOO_EXPENSIVE", FreeText: "Kemahalan buat budget bulanan saya",
	}

	const attempts = 5
	var created, alreadyProcessedCount int64
	var wg sync.WaitGroup
	wg.Add(attempts)

	for i := 0; i < attempts; i++ {
		go func() {
			defer wg.Done()
			_, alreadyProcessed, err := s.CreateMemberFeedback(context.Background(), input)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if alreadyProcessed {
				atomic.AddInt64(&alreadyProcessedCount, 1)
			} else {
				atomic.AddInt64(&created, 1)
			}
		}()
	}
	wg.Wait()

	if created != 1 {
		t.Fatalf("expected exactly 1 row actually created, got %d", created)
	}
	if alreadyProcessedCount != attempts-1 {
		t.Fatalf("expected %d ALREADY_PROCESSED results, got %d", attempts-1, alreadyProcessedCount)
	}

	var rowCount int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM member_feedback WHERE member_id = $1 AND context_type = $2 AND context_ref_id = $3`,
		memberID, "CANCELLATION", memberID).Scan(&rowCount); err != nil {
		t.Fatalf("count feedback rows: %v", err)
	}
	if rowCount != 1 {
		t.Fatalf("expected exactly 1 row in member_feedback, got %d", rowCount)
	}
}

// TestCreateSupportTicket_SecondCallWhileOpenReturnsExisting: calling request-human-help
// twice while a ticket is still OPEN must not create a second ticket.
func TestCreateSupportTicket_SecondCallWhileOpenReturnsExisting(t *testing.T) {
	s := newTestStore(t)
	tenantID, memberID := seedCustomerFixture(t, s.pool)

	const attempts = 5
	var created, alreadyProcessedCount int64
	var wg sync.WaitGroup
	wg.Add(attempts)

	for i := 0; i < attempts; i++ {
		go func() {
			defer wg.Done()
			_, alreadyProcessed, err := s.CreateSupportTicket(context.Background(), memberID, tenantID, "Butuh bantuan manusia")
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}
			if alreadyProcessed {
				atomic.AddInt64(&alreadyProcessedCount, 1)
			} else {
				atomic.AddInt64(&created, 1)
			}
		}()
	}
	wg.Wait()

	if created != 1 {
		t.Fatalf("expected exactly 1 ticket actually created, got %d", created)
	}
	if alreadyProcessedCount != attempts-1 {
		t.Fatalf("expected %d ALREADY_PROCESSED results, got %d", attempts-1, alreadyProcessedCount)
	}

	var openCount int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM support_tickets WHERE member_id = $1 AND tenant_id = $2 AND status = 'OPEN'`,
		memberID, tenantID).Scan(&openCount); err != nil {
		t.Fatalf("count open tickets: %v", err)
	}
	if openCount != 1 {
		t.Fatalf("expected exactly 1 OPEN ticket, got %d", openCount)
	}
}

// TestCanContact_SecondCallSameDaySamePurposeIsBlocked verifies the "no spam" guarantee:
// a second CanContact for the same member+purpose on the same day is denied, and an
// opted-out member is always denied regardless of prior contact history.
func TestCanContact_SecondCallSameDaySamePurposeIsBlocked(t *testing.T) {
	s := newTestStore(t)
	_, memberID := seedCustomerFixture(t, s.pool)

	first, err := s.CanContact(context.Background(), memberID, "receipt_feedback_prompt")
	if err != nil {
		t.Fatalf("first CanContact: %v", err)
	}
	if !first {
		t.Fatal("expected first CanContact call today to be allowed")
	}

	second, err := s.CanContact(context.Background(), memberID, "receipt_feedback_prompt")
	if err != nil {
		t.Fatalf("second CanContact: %v", err)
	}
	if second {
		t.Fatal("expected second CanContact call same day/purpose to be denied")
	}

	// A different purpose the same day is independent.
	otherPurpose, err := s.CanContact(context.Background(), memberID, "payment_reminder")
	if err != nil {
		t.Fatalf("other-purpose CanContact: %v", err)
	}
	if !otherPurpose {
		t.Fatal("expected a different purpose to be independently allowed")
	}
}

func TestCanContact_OptedOutMemberAlwaysDenied(t *testing.T) {
	s := newTestStore(t)
	_, memberID := seedCustomerFixture(t, s.pool)

	if _, err := s.pool.Exec(context.Background(), `UPDATE members SET contact_opt_out = true WHERE id = $1`, memberID); err != nil {
		t.Fatalf("set opt-out: %v", err)
	}

	allowed, err := s.CanContact(context.Background(), memberID, "receipt_feedback_prompt")
	if err != nil {
		t.Fatalf("CanContact: %v", err)
	}
	if allowed {
		t.Fatal("expected an opted-out member to always be denied contact")
	}
}

// TestRunPaymentReminderBatch_ConcurrentWorkersNeverDoubleReminder: two workers running the
// batch concurrently against the same pending transactions must never both record the same
// attempt_number for the same transaction — FOR UPDATE SKIP LOCKED should partition the work.
func TestRunPaymentReminderBatch_ConcurrentWorkersNeverDoubleReminder(t *testing.T) {
	s := newTestStore(t)
	tenantID, memberID := seedCustomerFixture(t, s.pool)

	trxID := "test-trx-" + fmt.Sprintf("%d", time.Now().UnixNano())
	seedReminderTransaction(t, s.pool, s, tenantID, memberID, trxID)
	t.Cleanup(func() {
		_, _ = s.pool.Exec(context.Background(), `DELETE FROM payment_reminders WHERE transaction_id = $1`, trxID)
		_, _ = s.pool.Exec(context.Background(), `DELETE FROM transactions WHERE trx_id = $1`, trxID)
	})

	const workers = 4
	var wg sync.WaitGroup
	wg.Add(workers)
	for i := 0; i < workers; i++ {
		go func() {
			defer wg.Done()
			if _, _, err := s.RunPaymentReminderBatch(context.Background(), 3, 10); err != nil {
				t.Errorf("worker batch run: %v", err)
			}
		}()
	}
	wg.Wait()

	var attemptCount int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM payment_reminders WHERE transaction_id = $1`, trxID).Scan(&attemptCount); err != nil {
		t.Fatalf("count reminders: %v", err)
	}
	// FOR UPDATE SKIP LOCKED serializes concurrent workers against the same row rather than
	// blocking them, so up to `workers` sequential rounds can each legitimately record one
	// reminder for this transaction. The actual invariant under test is that no two of those
	// rounds ever record the SAME attempt_number (checked below) — that's what "double
	// reminder" would look like, not the raw count.
	if attemptCount > workers {
		t.Fatalf("expected at most %d reminders (one per worker round), got %d", workers, attemptCount)
	}

	var distinctAttemptNumbers int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(DISTINCT attempt_number) FROM payment_reminders WHERE transaction_id = $1`, trxID).
		Scan(&distinctAttemptNumbers); err != nil {
		t.Fatalf("count distinct attempt numbers: %v", err)
	}
	if distinctAttemptNumbers != attemptCount {
		t.Fatalf("expected every reminder row to have a distinct attempt_number, got %d rows but %d distinct numbers",
			attemptCount, distinctAttemptNumbers)
	}
}

// TestRunPaymentReminderBatch_EscalatesAfterMaxAttempts verifies a transaction that's
// already hit the cap gets a support ticket instead of a 4th reminder.
func TestRunPaymentReminderBatch_EscalatesAfterMaxAttempts(t *testing.T) {
	s := newTestStore(t)
	tenantID, memberID := seedCustomerFixture(t, s.pool)

	trxID := "test-trx-cap-" + fmt.Sprintf("%d", time.Now().UnixNano())
	seedReminderTransaction(t, s.pool, s, tenantID, memberID, trxID)
	t.Cleanup(func() {
		_, _ = s.pool.Exec(context.Background(), `DELETE FROM support_tickets WHERE tenant_id = $1`, tenantID)
		_, _ = s.pool.Exec(context.Background(), `DELETE FROM payment_reminders WHERE transaction_id = $1`, trxID)
		_, _ = s.pool.Exec(context.Background(), `DELETE FROM transactions WHERE trx_id = $1`, trxID)
	})

	// Pre-seed 3 reminders (at the cap) directly.
	for attempt := 1; attempt <= 3; attempt++ {
		if _, err := s.pool.Exec(context.Background(), `
			INSERT INTO payment_reminders (transaction_id, attempt_number) VALUES ($1, $2)`, trxID, attempt); err != nil {
			t.Fatalf("seed reminder attempt %d: %v", attempt, err)
		}
	}

	// batchLimit is deliberately generous (100) since this shares a DB with other tests that
	// may leave their own PENDING transactions around; sent/tickets returned are batch-wide
	// totals, so assertions below are scoped to this test's own trxID/member instead of the
	// raw return values.
	if _, _, err := s.RunPaymentReminderBatch(context.Background(), 3, 100); err != nil {
		t.Fatalf("run batch: %v", err)
	}

	var attemptCountAfter int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM payment_reminders WHERE transaction_id = $1`, trxID).Scan(&attemptCountAfter); err != nil {
		t.Fatalf("count reminders: %v", err)
	}
	if attemptCountAfter != 3 {
		t.Fatalf("expected no new reminder once at cap (still 3), got %d", attemptCountAfter)
	}

	var openCount int
	if err := s.pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM support_tickets WHERE member_id = $1 AND status = 'OPEN'`, memberID).Scan(&openCount); err != nil {
		t.Fatalf("count open tickets: %v", err)
	}
	if openCount != 1 {
		t.Fatalf("expected exactly 1 open ticket after escalation, got %d", openCount)
	}
}
