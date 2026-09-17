package store

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// TestVerifyLoginOTP_CorrectCodeConsumesItExactlyOnce: a valid OTP succeeds once, and a
// replay of the exact same code afterward fails (already consumed) — it's a genuine
// one-time password, not a reusable short-lived password.
func TestVerifyLoginOTP_CorrectCodeConsumesItExactlyOnce(t *testing.T) {
	s := newTestStore(t)
	accountID := seedTestAccount(t, s.pool)

	if err := s.CreateLoginOTP(context.Background(), accountID, "correcthash", time.Now().Add(5*time.Minute)); err != nil {
		t.Fatalf("create otp: %v", err)
	}

	if err := s.VerifyLoginOTP(context.Background(), accountID, "correcthash"); err != nil {
		t.Fatalf("expected first verify to succeed, got %v", err)
	}

	err := s.VerifyLoginOTP(context.Background(), accountID, "correcthash")
	if err != ErrOTPInvalid {
		t.Fatalf("expected replay of consumed OTP to fail with ErrOTPInvalid, got %v", err)
	}
}

// TestVerifyLoginOTP_WrongCodeThenCorrectStillWorks: a wrong guess doesn't burn the OTP —
// only exhausting maxOTPAttempts or succeeding does.
func TestVerifyLoginOTP_WrongCodeThenCorrectStillWorks(t *testing.T) {
	s := newTestStore(t)
	accountID := seedTestAccount(t, s.pool)

	if err := s.CreateLoginOTP(context.Background(), accountID, "correcthash", time.Now().Add(5*time.Minute)); err != nil {
		t.Fatalf("create otp: %v", err)
	}

	if err := s.VerifyLoginOTP(context.Background(), accountID, "wronghash"); err != ErrOTPInvalid {
		t.Fatalf("expected wrong guess to fail, got %v", err)
	}
	if err := s.VerifyLoginOTP(context.Background(), accountID, "correcthash"); err != nil {
		t.Fatalf("expected correct code after one wrong guess to still succeed, got %v", err)
	}
}

// TestVerifyLoginOTP_AttemptCapLocksOutEvenCorrectCode: after maxOTPAttempts wrong guesses,
// the OTP is dead even if the next guess would've been correct — this is what makes
// brute-forcing a 6-digit code within its 5-minute window infeasible.
func TestVerifyLoginOTP_AttemptCapLocksOutEvenCorrectCode(t *testing.T) {
	s := newTestStore(t)
	accountID := seedTestAccount(t, s.pool)

	if err := s.CreateLoginOTP(context.Background(), accountID, "correcthash", time.Now().Add(5*time.Minute)); err != nil {
		t.Fatalf("create otp: %v", err)
	}

	for i := 0; i < maxOTPAttempts; i++ {
		if err := s.VerifyLoginOTP(context.Background(), accountID, "wronghash"); err != ErrOTPInvalid {
			t.Fatalf("attempt %d: expected ErrOTPInvalid, got %v", i, err)
		}
	}

	if err := s.VerifyLoginOTP(context.Background(), accountID, "correcthash"); err != ErrOTPInvalid {
		t.Fatalf("expected correct code to be rejected after hitting attempt cap, got %v", err)
	}
}

// TestVerifyLoginOTP_ExpiredCodeRejected: an OTP past its expiry is rejected even though it
// was never consumed or attempted.
func TestVerifyLoginOTP_ExpiredCodeRejected(t *testing.T) {
	s := newTestStore(t)
	accountID := seedTestAccount(t, s.pool)

	if err := s.CreateLoginOTP(context.Background(), accountID, "correcthash", time.Now().Add(-time.Minute)); err != nil {
		t.Fatalf("create otp: %v", err)
	}

	if err := s.VerifyLoginOTP(context.Background(), accountID, "correcthash"); err != ErrOTPInvalid {
		t.Fatalf("expected expired OTP to be rejected, got %v", err)
	}
}

// seedTestAccount inserts a throwaway login account (password/tenant irrelevant to OTP
// logic) scoped to this test run, and returns its id.
func seedTestAccount(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	ctx := context.Background()
	email := fmt.Sprintf("otp-test-%d@example.com", time.Now().UnixNano())

	var accountID string
	err := pool.QueryRow(ctx, `
		INSERT INTO accounts (email, password_hash, role, name)
		VALUES ($1, 'unused-hash', 'partner', 'Test Account')
		RETURNING id::text`, email).Scan(&accountID)
	if err != nil {
		t.Fatalf("seed account: %v", err)
	}

	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM login_otps WHERE account_id = $1`, accountID)
		_, _ = pool.Exec(ctx, `DELETE FROM sessions WHERE account_id = $1`, accountID)
		_, _ = pool.Exec(ctx, `DELETE FROM accounts WHERE id = $1`, accountID)
	})

	return accountID
}
