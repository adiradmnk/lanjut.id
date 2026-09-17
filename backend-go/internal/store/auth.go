package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"

	"lanjut/backend/internal/models"
)

// ErrOTPInvalid means the OTP didn't match, was already consumed, expired, or the account
// has hit the attempt cap for its current OTP — all reported identically to the client so a
// brute-forcer can't distinguish "wrong code" from "too many tries" from "expired".
var ErrOTPInvalid = errors.New("otp invalid or expired")

// maxOTPAttempts caps guesses against a single OTP before it's permanently dead, even if
// still within its time window.
const maxOTPAttempts = 5

// GetAccountByEmail looks up a login account by email.
func (s *Store) GetAccountByEmail(ctx context.Context, email string) (*models.Account, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id::text, email, password_hash, role, tenant_id, name, created_at::text
		FROM accounts WHERE email = $1`, email)
	return scanAccount(row)
}

func scanAccount(row rowScanner) (*models.Account, error) {
	var a models.Account
	err := row.Scan(&a.ID, &a.Email, &a.PasswordHash, &a.Role, &a.TenantID, &a.Name, &a.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan account: %w", err)
	}
	return &a, nil
}

// CreateLoginOTP records a freshly-generated OTP's hash for an account, to be checked later
// by VerifyLoginOTP. The raw OTP itself is never stored — only its hash, same pattern as
// magic_tokens.
func (s *Store) CreateLoginOTP(ctx context.Context, accountID, otpHash string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO login_otps (account_id, otp_hash, expires_at) VALUES ($1, $2, $3)`,
		accountID, otpHash, expiresAt)
	return err
}

// VerifyLoginOTP checks the most recent unconsumed OTP for an account against the provided
// hash. On success it's marked consumed (so it can never be reused) inside the same locked
// transaction as the attempt-count check, so two concurrent verify attempts can't both
// succeed against the same OTP, and can't race past the attempt cap either.
func (s *Store) VerifyLoginOTP(ctx context.Context, accountID, providedHash string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var otpID, storedHash string
	var expiresAt time.Time
	var attemptCount int
	err = tx.QueryRow(ctx, `
		SELECT id::text, otp_hash, expires_at, attempt_count
		FROM login_otps
		WHERE account_id = $1 AND consumed_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
		FOR UPDATE`, accountID).Scan(&otpID, &storedHash, &expiresAt, &attemptCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrOTPInvalid
	}
	if err != nil {
		return fmt.Errorf("lock otp: %w", err)
	}

	if attemptCount >= maxOTPAttempts || !expiresAt.After(time.Now()) {
		return ErrOTPInvalid
	}

	if storedHash != providedHash {
		if _, err := tx.Exec(ctx, `UPDATE login_otps SET attempt_count = attempt_count + 1 WHERE id = $1`, otpID); err != nil {
			return fmt.Errorf("record failed attempt: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit tx: %w", err)
		}
		return ErrOTPInvalid
	}

	if _, err := tx.Exec(ctx, `UPDATE login_otps SET consumed_at = now() WHERE id = $1`, otpID); err != nil {
		return fmt.Errorf("consume otp: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}

// CreateSession issues a new session for an account after a successful OTP verification.
func (s *Store) CreateSession(ctx context.Context, accountID, tokenHash string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO sessions (account_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		accountID, tokenHash, expiresAt)
	return err
}

// GetAccountBySessionToken resolves a bearer token (already hashed by the caller) back to
// the account it belongs to, or ErrNotFound if the session doesn't exist or has expired.
func (s *Store) GetAccountBySessionToken(ctx context.Context, tokenHash string) (*models.Account, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT a.id::text, a.email, a.password_hash, a.role, a.tenant_id, a.name, a.created_at::text
		FROM sessions s
		JOIN accounts a ON a.id = s.account_id
		WHERE s.token_hash = $1 AND s.expires_at > now()`, tokenHash)
	return scanAccount(row)
}
