package handlers_test

// FASE 1b hard rules, verified through the real HTTP flow (black-box) plus a direct store
// read for the log table (which has no dedicated HTTP endpoint by design — it's an internal
// audit trail, not something exposed raw over the API):
//   - signature/api-key must NEVER appear in payment_gateway_logs, even read straight back
//     from the table.
//   - the AI-facing transaction feed must NEVER return name/email/phone.

import (
	"context"
	"net/http"
	"os"
	"strings"
	"testing"

	"lanjut/backend/internal/db"
	"lanjut/backend/internal/store"
)

func TestFase1b_PaymentGatewayLogs_NeverContainRealSignature(t *testing.T) {
	srv := newTestServer(t)

	var checkout struct {
		TrxID  string `json:"trx_id"`
		BNISig string `json:"bni_signature"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", map[string]any{
		"member_id": fixtureMemberID,
		"amount":    45000,
	}, &checkout)
	if resp.StatusCode != http.StatusOK || checkout.TrxID == "" {
		t.Fatalf("checkout-va: status=%d body=%s", resp.StatusCode, body)
	}
	if checkout.BNISig == "" {
		t.Fatal("expected a non-empty bni_signature on the checkout response itself (sanity check on the test setup)")
	}

	// Direct store read of the log table — there's no HTTP endpoint for raw gateway logs by
	// design (it's an internal audit trail), so this reaches the DB the same way
	// newTestServer's own setup does.
	dsn := requireTestDSN(t)
	ctx := context.Background()
	pool, err := db.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()
	s := store.New(pool)

	logs, err := s.ListPaymentGatewayLogsByTransaction(ctx, checkout.TrxID)
	if err != nil {
		t.Fatalf("list payment gateway logs: %v", err)
	}
	if len(logs) == 0 {
		t.Fatal("expected at least one payment_gateway_logs row (REQUEST/RESPONSE) for this transaction")
	}

	for _, l := range logs {
		raw := string(l.RawPayload)
		if strings.Contains(raw, checkout.BNISig) {
			t.Fatalf("payment_gateway_logs row (%s) contains the real signature verbatim: %s", l.Direction, raw)
		}
		if !strings.Contains(raw, "[REDACTED]") {
			t.Fatalf("payment_gateway_logs row (%s) missing the [REDACTED] placeholder: %s", l.Direction, raw)
		}
	}
}

func TestFase1b_AITransactionFeed_NeverContainsPII(t *testing.T) {
	srv := newTestServer(t)

	// Settle a transaction first so there's at least one row for the feed to return.
	var checkout struct {
		TrxID string `json:"trx_id"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", map[string]any{
		"member_id": fixtureMemberID,
		"amount":    35000,
	}, &checkout)
	if resp.StatusCode != http.StatusOK || checkout.TrxID == "" {
		t.Fatalf("checkout-va: status=%d body=%s", resp.StatusCode, body)
	}
	resp, body = doJSON(t, http.MethodPost, srv.URL+"/webhook/bni-payment", map[string]any{"trx_id": checkout.TrxID}, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("settle: status=%d body=%s", resp.StatusCode, body)
	}

	var feedResp struct {
		Status       string `json:"status"`
		Transactions []struct {
			MemberRef       string  `json:"member_ref"`
			SessionCategory string  `json:"session_category"`
			Amount          float64 `json:"amount"`
			Status          string  `json:"status"`
			BillingType     string  `json:"billing_type"`
		} `json:"transactions"`
	}
	resp, rawBody := doJSON(t, http.MethodGet, srv.URL+"/api/ai/tenants/"+fixtureTenantID+"/transaction-feed", nil, &feedResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("transaction-feed: status=%d body=%s", resp.StatusCode, rawBody)
	}
	if len(feedResp.Transactions) == 0 {
		t.Fatal("expected at least one item in the AI transaction feed")
	}

	// fixtureMemberID's real PII, from migration 0002's seed data — must never appear here.
	bodyStr := string(rawBody)
	forbidden := []string{"Anisa Putri", "anisa.putri@example.com", "081922334455", "bni_va_number", "bni_signature", "virtualAccountNo", "raw_payload"}
	for _, f := range forbidden {
		if strings.Contains(bodyStr, f) {
			t.Fatalf("AI transaction feed response contains forbidden PII/secret fragment %q: %s", f, bodyStr)
		}
	}

	for _, item := range feedResp.Transactions {
		if item.MemberRef == "" {
			t.Fatal("expected member_ref to be populated (internal id is fine, it's not PII)")
		}
	}
}

// requireTestDSN is a small shared helper so fase1b_test.go doesn't duplicate newTestServer's
// TEST_DATABASE_URL skip logic.
func requireTestDSN(t *testing.T) string {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping")
	}
	return dsn
}
