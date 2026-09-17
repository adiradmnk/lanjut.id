package services

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/store"
)

type TokenPayload struct {
	MemberID   string `json:"member_id"`
	TenantID   string `json:"merchant_id"`
	IssuedAt   int64  `json:"issued_at"`
	ExpiresAt  int64  `json:"expires_at"`
	Nonce      string `json:"nonce"`
}

type MagicTokenService struct {
	secret string
	store  *store.Store
}

func NewMagicTokenService(secret string, s *store.Store) *MagicTokenService {
	return &MagicTokenService{secret: secret, store: s}
}

var (
	ErrMalformedToken     = errors.New("MALFORMED_TOKEN_STRUCTURE")
	ErrInvalidTokenParts  = errors.New("INVALID_TOKEN_PARTS")
	ErrSignatureMismatch  = errors.New("SIGNATURE_VERIFICATION_FAILED")
	ErrTokenExpired       = errors.New("TOKEN_EXPIRED_PAST_24H")
	ErrMemberNotFound     = errors.New("MEMBER_NOT_FOUND_IN_DB")
	ErrCrossTenant        = errors.New("CROSS_TENANT_ACCESS_DENIED")
	ErrCorruptedPayload   = errors.New("CORRUPTED_PAYLOAD_JSON")
)

// GenerateToken creates an HMAC-SHA256 signed magic link token, expiring in 24h.
func (m *MagicTokenService) GenerateToken(ctx context.Context, memberID, tenantID string) (string, error) {
	now := time.Now().UnixMilli()
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}

	payload := TokenPayload{
		MemberID:  memberID,
		TenantID:  tenantID,
		IssuedAt:  now,
		ExpiresAt: now + 24*60*60*1000,
		Nonce:     base64.RawURLEncoding.EncodeToString(nonce),
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)
	sig := m.sign(payloadB64)
	token := fmt.Sprintf("%s.%s", payloadB64, sig)

	tokenHash := hashToken(token)
	if err := m.store.SaveMagicToken(ctx, memberID, tokenHash, payload.ExpiresAt); err != nil {
		return "", err
	}
	return token, nil
}

func (m *MagicTokenService) sign(payloadB64 string) string {
	mac := hmac.New(sha256.New, []byte(m.secret))
	mac.Write([]byte(payloadB64))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// ValidateToken verifies signature + expiry + cross-tenant binding, then loads the member.
func (m *MagicTokenService) ValidateToken(ctx context.Context, rawToken string) (*models.Member, error) {
	if rawToken == "" {
		return nil, ErrMalformedToken
	}

	var payloadB64, providedSig string
	for i := len(rawToken) - 1; i >= 0; i-- {
		if rawToken[i] == '.' {
			payloadB64, providedSig = rawToken[:i], rawToken[i+1:]
			break
		}
	}
	if payloadB64 == "" || providedSig == "" {
		return nil, ErrInvalidTokenParts
	}

	expectedSig := m.sign(payloadB64)
	if subtle.ConstantTimeCompare([]byte(providedSig), []byte(expectedSig)) != 1 {
		return nil, ErrSignatureMismatch
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, ErrCorruptedPayload
	}
	var payload TokenPayload
	if err := json.Unmarshal(payloadJSON, &payload); err != nil {
		return nil, ErrCorruptedPayload
	}

	if time.Now().UnixMilli() > payload.ExpiresAt {
		return nil, ErrTokenExpired
	}

	member, err := m.store.GetMember(ctx, payload.MemberID)
	if errors.Is(err, store.ErrNotFound) {
		return nil, ErrMemberNotFound
	}
	if err != nil {
		return nil, err
	}

	if payload.TenantID != "" && member.TenantID != payload.TenantID {
		return nil, ErrCrossTenant
	}

	return member, nil
}
