package handlers_test

// FASE 0 — safety net. Pins the CURRENT response shape of the endpoints frontend/ already
// depends on (resolve-magic-token, checkout-va, webhook settle, merchant dashboard), BEFORE
// the FASE 1 payment-gateway-adapter refactor touches anything. These must stay green,
// unmodified, after FASE 1 — if they break, the refactor is wrong, not the test.

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

const baselineTestSecret = "integration-test-secret"

// mintRawToken replicates services.MagicTokenService's token format (base64url JSON
// payload + HMAC-SHA256 signature, both base64url) without needing access to its
// unexported sign/hash helpers, so this test can mint an already-expired token — something
// the real GenerateToken (hardcoded +24h) can never produce.
func mintRawToken(t *testing.T, memberID, tenantID string, expiresAt time.Time) string {
	t.Helper()

	payload := map[string]any{
		"member_id":  memberID,
		"merchant_id": tenantID,
		"issued_at":  time.Now().UnixMilli(),
		"expires_at": expiresAt.UnixMilli(),
		"nonce":      "baseline-test-nonce",
	}
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	mac := hmac.New(sha256.New, []byte(baselineTestSecret))
	mac.Write([]byte(payloadB64))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return payloadB64 + "." + sig
}

// TestBaseline_ResolveMagicToken_ValidToken pins the success response shape.
func TestBaseline_ResolveMagicToken_ValidToken(t *testing.T) {
	srv := newTestServer(t)

	token := mintRawToken(t, fixtureMemberID, fixtureTenantID, time.Now().Add(time.Hour))

	var resp struct {
		Status            string `json:"status"`
		TokenVerifiedHMAC bool   `json:"token_verified_hmac"`
		MerchantInfo      struct {
			ID                    string  `json:"id"`
			BusinessName          string  `json:"business_name"`
			Category              string  `json:"category"`
			MaxDiscountAllowedPct float64 `json:"max_discount_allowed_pct"`
		} `json:"merchant_info"`
		Member struct {
			ID            string `json:"id"`
			Name          string `json:"name"`
			Email         string `json:"email"`
			Phone         string `json:"phone"`
			MerchantID    string `json:"merchant_id"`
			MerchantName  string `json:"merchant_name"`
			ChurnRiskFlag string `json:"churn_risk_flag"`
		} `json:"member"`
		SmartOptions []any `json:"smart_options"`
	}
	httpResp, body := doJSON(t, http.MethodGet, srv.URL+"/api/member/resolve-magic-token?token="+token, nil, &resp)
	if httpResp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s", httpResp.StatusCode, body)
	}
	if resp.Status != "success" || !resp.TokenVerifiedHMAC {
		t.Fatalf("expected status=success, token_verified_hmac=true, body=%s", body)
	}
	if resp.Member.ID != fixtureMemberID || resp.Member.MerchantID != fixtureTenantID {
		t.Fatalf("expected member %s / tenant %s, body=%s", fixtureMemberID, fixtureTenantID, body)
	}
	if resp.MerchantInfo.ID != fixtureTenantID {
		t.Fatalf("expected merchant_info.id=%s, body=%s", fixtureTenantID, body)
	}
	if resp.SmartOptions == nil {
		t.Fatalf("expected smart_options array (possibly empty, not null), body=%s", body)
	}
}

// TestBaseline_ResolveMagicToken_ExpiredToken pins the 401 + error shape for an expired token.
func TestBaseline_ResolveMagicToken_ExpiredToken(t *testing.T) {
	srv := newTestServer(t)

	token := mintRawToken(t, fixtureMemberID, fixtureTenantID, time.Now().Add(-time.Hour))

	var resp struct {
		Status string `json:"status"`
		Code   string `json:"code"`
	}
	httpResp, body := doJSON(t, http.MethodGet, srv.URL+"/api/member/resolve-magic-token?token="+token, nil, &resp)
	if httpResp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 for expired token, got %d body=%s", httpResp.StatusCode, body)
	}
	if resp.Status != "error" || resp.Code != "TOKEN_EXPIRED_PAST_24H" {
		t.Fatalf("expected status=error code=TOKEN_EXPIRED_PAST_24H, body=%s", body)
	}
}

// TestBaseline_ResolveMagicToken_CrossTenant pins the 403 + error shape when a token's
// tenant claim doesn't match the member's actual tenant.
func TestBaseline_ResolveMagicToken_CrossTenant(t *testing.T) {
	srv := newTestServer(t)

	// fixtureMemberID actually belongs to fixtureTenantID (mch-bandungpilates-04); claim a
	// different tenant (mch-fitbody-01, from the same 0002 seed data) in the token.
	token := mintRawToken(t, fixtureMemberID, "mch-fitbody-01", time.Now().Add(time.Hour))

	var resp struct {
		Status string `json:"status"`
		Code   string `json:"code"`
	}
	httpResp, body := doJSON(t, http.MethodGet, srv.URL+"/api/member/resolve-magic-token?token="+token, nil, &resp)
	if httpResp.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for cross-tenant token, got %d body=%s", httpResp.StatusCode, body)
	}
	if resp.Status != "error" || resp.Code != "CROSS_TENANT_ACCESS_DENIED" {
		t.Fatalf("expected status=error code=CROSS_TENANT_ACCESS_DENIED, body=%s", body)
	}
}

// TestBaseline_CheckoutVA pins the checkout-va success response shape (trx_id, va_number,
// amount, expired_at, bni_signature) that frontend/ already parses directly.
func TestBaseline_CheckoutVA(t *testing.T) {
	srv := newTestServer(t)

	var resp struct {
		Status       string  `json:"status"`
		TrxID        string  `json:"trx_id"`
		MerchantID   string  `json:"merchant_id"`
		MerchantName string  `json:"merchant_name"`
		VANumber     string  `json:"va_number"`
		Amount       float64 `json:"amount"`
		ExpiredAt    string  `json:"expired_at"`
		BNISignature string  `json:"bni_signature"`
	}
	httpResp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", map[string]any{
		"member_id": fixtureMemberID,
		"amount":    50000,
	}, &resp)
	if httpResp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s", httpResp.StatusCode, body)
	}
	if resp.Status != "success" || resp.TrxID == "" || resp.VANumber == "" || resp.BNISignature == "" {
		t.Fatalf("expected success with trx_id/va_number/bni_signature populated, body=%s", body)
	}
	if resp.Amount != 50000 {
		t.Fatalf("expected amount=50000, got %v, body=%s", resp.Amount, body)
	}
}

// TestBaseline_Webhook_SuccessAndDuplicate pins /webhook/bni-payment's settle + idempotent
// duplicate-delivery response shapes.
func TestBaseline_Webhook_SuccessAndDuplicate(t *testing.T) {
	srv := newTestServer(t)

	var checkout struct {
		TrxID string `json:"trx_id"`
	}
	httpResp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", map[string]any{
		"member_id": fixtureMemberID,
		"amount":    30000,
	}, &checkout)
	if httpResp.StatusCode != http.StatusOK || checkout.TrxID == "" {
		t.Fatalf("checkout-va setup failed: status=%d body=%s", httpResp.StatusCode, body)
	}

	var settleResp struct {
		Status        string `json:"status"`
		MemberUpdated struct {
			ID string `json:"id"`
		} `json:"member_updated"`
	}
	httpResp, body = doJSON(t, http.MethodPost, srv.URL+"/webhook/bni-payment", map[string]any{
		"trx_id": checkout.TrxID,
	}, &settleResp)
	if httpResp.StatusCode != http.StatusOK {
		t.Fatalf("settle: status=%d body=%s", httpResp.StatusCode, body)
	}
	if settleResp.Status != "success" || settleResp.MemberUpdated.ID != fixtureMemberID {
		t.Fatalf("expected status=success and member_updated.id=%s, body=%s", fixtureMemberID, body)
	}

	var dupResp struct {
		Status string `json:"status"`
	}
	httpResp, body = doJSON(t, http.MethodPost, srv.URL+"/webhook/bni-payment", map[string]any{
		"trx_id": checkout.TrxID,
	}, &dupResp)
	if httpResp.StatusCode != http.StatusOK {
		t.Fatalf("duplicate settle: status=%d body=%s", httpResp.StatusCode, body)
	}
	if dupResp.Status != "ALREADY_PROCESSED" {
		t.Fatalf("expected duplicate webhook delivery to report ALREADY_PROCESSED, got %q body=%s", dupResp.Status, body)
	}
}

// TestBaseline_MerchantDashboard pins GET /api/merchant/:tenantId/dashboard's response shape.
func TestBaseline_MerchantDashboard(t *testing.T) {
	srv := newTestServer(t)

	var resp struct {
		Success  bool `json:"success"`
		Merchant struct {
			ID           string `json:"id"`
			BusinessName string `json:"business_name"`
		} `json:"merchant"`
		Stats struct {
			TotalActiveMembers int     `json:"total_active_members"`
			MembersAtRisk      int     `json:"members_at_risk"`
			MembersSavedByAI   int     `json:"members_saved_by_ai"`
			RetentionRatePct   float64 `json:"retention_rate_pct"`
			SavedRevenueIDR    float64 `json:"saved_revenue_idr"`
		} `json:"stats"`
	}
	httpResp, body := doJSON(t, http.MethodGet, srv.URL+"/api/merchant/"+fixtureTenantID+"/dashboard", nil, &resp)
	if httpResp.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s", httpResp.StatusCode, body)
	}
	if !resp.Success || resp.Merchant.ID != fixtureTenantID {
		t.Fatalf("expected success=true merchant.id=%s, body=%s", fixtureTenantID, body)
	}
}
