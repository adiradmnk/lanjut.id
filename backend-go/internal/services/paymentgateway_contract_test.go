package services

// FASE 1 — one contract test suite run against EVERY PaymentGatewayAdapter implementation
// (BNI, Midtrans), so a future third provider gets the same guarantees for free just by
// adding itself to adaptersUnderTest below. No database needed — CreatePaymentInstruction/
// ParseWebhook are pure logic in simulator mode.

import (
	"context"
	"net/http"
	"testing"

	"lanjut/backend/internal/config"
)

func adaptersUnderTest() map[string]PaymentGatewayAdapter {
	return map[string]PaymentGatewayAdapter{
		"BNI": NewBNIPaymentService(config.Config{
			BNICompanyCode: "8808", BNICorporateID: "TESTCORP", BNIUserID: "TESTUSER",
		}),
		// No MIDTRANS_SERVER_KEY/CLIENT_KEY -> local simulator, same as BNI without live creds.
		"Midtrans": NewMidtransAdapter(config.Config{}),
	}
}

func testCreatePaymentRequest() CreatePaymentRequest {
	return CreatePaymentRequest{
		MemberID: "mbr-contract-test", TenantID: "mch-contract-test",
		SessionID: "ses-contract-test", SessionTitle: "Contract Test Session",
		AmountIDR: 75000, CustomerName: "Contract Test User", CustomerEmail: "contract@example.com",
		CustomerPhone: "081200000000",
	}
}

// TestPaymentGatewayAdapter_CreatePaymentInstruction_Succeeds verifies every adapter can
// issue a payment instruction in its default (sandbox/simulator) configuration.
func TestPaymentGatewayAdapter_CreatePaymentInstruction_Succeeds(t *testing.T) {
	for name, adapter := range adaptersUnderTest() {
		t.Run(name, func(t *testing.T) {
			result, err := adapter.CreatePaymentInstruction(context.Background(), testCreatePaymentRequest())
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.Status != "SUCCESS" {
				t.Fatalf("expected status=SUCCESS in sandbox/simulator mode, got %q (error: %q)", result.Status, result.Error)
			}
			if result.TrxID == "" {
				t.Fatal("expected non-empty TrxID")
			}
			if result.ProviderRef == "" {
				t.Fatal("expected non-empty ProviderRef")
			}
			if result.AmountIDR != 75000 {
				t.Fatalf("expected AmountIDR to echo the request (75000), got %v", result.AmountIDR)
			}
			if result.ExpiredAt.IsZero() {
				t.Fatal("expected a non-zero ExpiredAt")
			}
		})
	}
}

// TestPaymentGatewayAdapter_CreatePaymentInstruction_TrxIDsAreUnique verifies every adapter
// produces a distinct TrxID per call — CreatePendingTransaction (store.go) uses TrxID as
// its idempotency_key, so a collision here would silently merge two unrelated payments.
func TestPaymentGatewayAdapter_CreatePaymentInstruction_TrxIDsAreUnique(t *testing.T) {
	for name, adapter := range adaptersUnderTest() {
		t.Run(name, func(t *testing.T) {
			req := testCreatePaymentRequest()
			r1, err := adapter.CreatePaymentInstruction(context.Background(), req)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			r2, err := adapter.CreatePaymentInstruction(context.Background(), req)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if r1.TrxID == r2.TrxID {
				t.Fatalf("expected distinct TrxID across two calls with identical input, got the same value twice: %s", r1.TrxID)
			}
			if r1.ProviderRef == r2.ProviderRef {
				t.Fatalf("expected distinct ProviderRef across two calls with identical input, got the same value twice: %s", r1.ProviderRef)
			}
		})
	}
}

// TestPaymentGatewayAdapter_ParseWebhook_RejectsGarbagePayload verifies every adapter
// returns an error (never a zero-value "success") for a payload that isn't even valid JSON.
func TestPaymentGatewayAdapter_ParseWebhook_RejectsGarbagePayload(t *testing.T) {
	for name, adapter := range adaptersUnderTest() {
		t.Run(name, func(t *testing.T) {
			_, err := adapter.ParseWebhook(context.Background(), []byte("not json at all"), http.Header{})
			if err == nil {
				t.Fatal("expected an error for a non-JSON webhook payload")
			}
		})
	}
}

// TestPaymentGatewayAdapter_ParseWebhook_NormalizesToPaid verifies every adapter's "this
// payment succeeded" webhook payload normalizes to PaymentStatusPaid with the transaction id
// and amount carried through — this is the shared contract SettleTransaction relies on.
func TestPaymentGatewayAdapter_ParseWebhook_NormalizesToPaid(t *testing.T) {
	cases := map[string]struct {
		adapter PaymentGatewayAdapter
		payload string
		wantRef string
		wantTrx string
	}{
		"BNI": {
			adapter: NewBNIPaymentService(config.Config{}),
			payload: `{"trx_id":"TRX-ABC-123","va_number":"8808000012340001","amount":50000}`,
			wantRef: "8808000012340001",
			wantTrx: "TRX-ABC-123",
		},
		"Midtrans": {
			adapter: NewMidtransAdapter(config.Config{}), // no server key -> signature check skipped
			payload: `{"order_id":"TRX-XYZ-789","status_code":"200","gross_amount":"50000.00","transaction_status":"settlement"}`,
			wantRef: "TRX-XYZ-789",
			wantTrx: "TRX-XYZ-789",
		},
	}

	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			event, err := tc.adapter.ParseWebhook(context.Background(), []byte(tc.payload), http.Header{})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if event.Status != PaymentStatusPaid {
				t.Fatalf("expected PaymentStatusPaid, got %q", event.Status)
			}
			if event.ProviderRef != tc.wantRef {
				t.Fatalf("expected ProviderRef=%q, got %q", tc.wantRef, event.ProviderRef)
			}
			if event.InternalTrxID != tc.wantTrx {
				t.Fatalf("expected InternalTrxID=%q, got %q", tc.wantTrx, event.InternalTrxID)
			}
			if event.AmountIDR != 50000 {
				t.Fatalf("expected AmountIDR=50000, got %v", event.AmountIDR)
			}
		})
	}
}

// TestMidtransAdapter_ParseWebhook_RejectsInvalidSignature: once MIDTRANS_SERVER_KEY is
// configured, a webhook whose signature_key doesn't match SHA512(order_id+status_code+
// gross_amount+server_key) must be rejected — this is Midtrans-specific since the BNI
// sandbox payload carries no signature to verify (see bnipayment.go ParseWebhook's ASUMSI).
func TestMidtransAdapter_ParseWebhook_RejectsInvalidSignature(t *testing.T) {
	adapter := NewMidtransAdapter(config.Config{MidtransServerKey: "test-server-key", MidtransClientKey: "test-client-key"})

	payload := `{"order_id":"TRX-SIG-TEST","status_code":"200","gross_amount":"50000.00","transaction_status":"settlement","signature_key":"deadbeef-definitely-wrong"}`
	_, err := adapter.ParseWebhook(context.Background(), []byte(payload), http.Header{})
	if err == nil {
		t.Fatal("expected an error for an invalid signature_key")
	}
}

// TestMidtransAdapter_ParseWebhook_AcceptsValidSignature is the positive counterpart: the
// correctly-computed signature must be accepted.
func TestMidtransAdapter_ParseWebhook_AcceptsValidSignature(t *testing.T) {
	serverKey := "test-server-key"
	orderID, statusCode, grossAmount := "TRX-SIG-TEST-2", "200", "50000.00"
	validSig := computeMidtransSignature(orderID, statusCode, grossAmount, serverKey)

	adapter := NewMidtransAdapter(config.Config{MidtransServerKey: serverKey, MidtransClientKey: "test-client-key"})

	payload := `{"order_id":"` + orderID + `","status_code":"` + statusCode + `","gross_amount":"` + grossAmount + `","transaction_status":"settlement","signature_key":"` + validSig + `"}`
	event, err := adapter.ParseWebhook(context.Background(), []byte(payload), http.Header{})
	if err != nil {
		t.Fatalf("expected valid signature to be accepted, got error: %v", err)
	}
	if event.Status != PaymentStatusPaid {
		t.Fatalf("expected PaymentStatusPaid, got %q", event.Status)
	}
}

// TestPaymentGatewayAdapter_ParseWebhook_NonPaidStatusesNormalizeCorrectly verifies the
// non-success Midtrans transaction_status values map to the right internal PaymentStatus —
// this is what MidtransWebhook (payments.go) relies on to decide whether to ever call
// SettleTransaction at all.
func TestPaymentGatewayAdapter_ParseWebhook_NonPaidStatusesNormalizeCorrectly(t *testing.T) {
	adapter := NewMidtransAdapter(config.Config{}) // simulator mode, no signature check

	cases := map[string]PaymentStatus{
		"pending": PaymentStatusPending,
		"deny":    PaymentStatusFailed,
		"cancel":  PaymentStatusFailed,
		"failure": PaymentStatusFailed,
		"expire":  PaymentStatusExpired,
	}
	for transactionStatus, want := range cases {
		t.Run(transactionStatus, func(t *testing.T) {
			payload := `{"order_id":"TRX-STATUS-TEST","status_code":"200","gross_amount":"50000.00","transaction_status":"` + transactionStatus + `"}`
			event, err := adapter.ParseWebhook(context.Background(), []byte(payload), http.Header{})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if event.Status != want {
				t.Fatalf("transaction_status=%q: expected %q, got %q", transactionStatus, want, event.Status)
			}
		})
	}
}

// TestPaymentGatewayAdapter_ImplementsInterface is a compile-time-adjacent sanity check that
// every entry in adaptersUnderTest genuinely satisfies PaymentGatewayAdapter (redundant with
// the var _ PaymentGatewayAdapter assertions in bnipayment.go/midtrans.go, but keeps the
// contract suite self-contained if those assertions are ever removed).
func TestPaymentGatewayAdapter_ImplementsInterface(t *testing.T) {
	for name, adapter := range adaptersUnderTest() {
		if adapter == nil {
			t.Fatalf("%s: adapter is nil", name)
		}
	}
}
