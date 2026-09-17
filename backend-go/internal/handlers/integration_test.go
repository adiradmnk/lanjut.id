package handlers_test

// Full-path integration tests driven entirely through the public HTTP API (black-box),
// wired exactly like cmd/server/main.go. They reuse the seed fixtures from migration
// 0002 (tenant mch-bandungpilates-04 / member mbr-anisa-05 / session ses-bdg-reformer-basic)
// so no direct DB access is needed here. Skipped unless TEST_DATABASE_URL is set.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/config"
	"lanjut/backend/internal/db"
	"lanjut/backend/internal/handlers"
	"lanjut/backend/internal/routes"
	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

const (
	fixtureTenantID  = "mch-bandungpilates-04"
	fixtureMemberID  = "mbr-anisa-05"
	fixtureSessionID = "ses-bdg-reformer-basic"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping handler integration test")
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

	s := store.New(pool)
	magicToken := services.NewMagicTokenService("integration-test-secret", s)
	// Deliberately unroutable: exercises the "AI sidecar offline -> fall back to local
	// deterministic generator" edge case on every call in this file, same as production
	// behavior when the FastAPI sidecar is down or slow.
	aiGateway := services.NewAIGateway("http://127.0.0.1:1")
	bni := services.NewBNIPaymentService(config.Config{
		BNICompanyCode: "8808", BNICorporateID: "TESTCORP", BNIUserID: "TESTUSER",
	})
	// nil storage/mailjet: R2 and Mailjet aren't configured for this test run — guidebook
	// upload and OTP login aren't part of these tests.
	h := handlers.New(s, magicToken, aiGateway, bni, nil, nil)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	routes.Register(r, h)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return srv
}

func doJSON(t *testing.T, method, url string, body any, out any) (*http.Response, []byte) {
	t.Helper()
	var reader *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}

	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer resp.Body.Close()

	respBody := make([]byte, 0)
	buf := make([]byte, 4096)
	for {
		n, readErr := resp.Body.Read(buf)
		respBody = append(respBody, buf[:n]...)
		if readErr != nil {
			break
		}
	}

	if out != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, out); err != nil {
			t.Fatalf("unmarshal response body %q: %v", respBody, err)
		}
	}
	return resp, respBody
}

// uniquePackageName avoids collisions if this test runs repeatedly against a
// non-throwaway database (product_packages has no unique constraint on name, but keeping
// runs distinguishable in logs is still useful).
func uniquePackageName(t *testing.T) string {
	return fmt.Sprintf("Integration Test Package %s %d", t.Name(), time.Now().UnixNano())
}

// TestFullOfferLifecycle_GenerateApproveResolveCheckoutSettle walks the entire mandatory
// human-approval path: catalog package -> generate-offers -> merchant approves -> the
// customer's magic-token portal shows ONLY the approved offer -> checkout -> BNI webhook
// settles it exactly once.
func TestFullOfferLifecycle_GenerateApproveResolveCheckoutSettle(t *testing.T) {
	srv := newTestServer(t)

	// 1. Merchant adds a catalog package (the "guidebook").
	var pkgResp struct {
		Status  string `json:"status"`
		Package struct {
			ID string `json:"id"`
		} `json:"package"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/merchant/"+fixtureTenantID+"/packages", gin.H{
		"name":         uniquePackageName(t),
		"description":  "Integration test package",
		"price_idr":    120000,
		"billing_type": "ONE_TIME",
	}, &pkgResp)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create package: status=%d body=%s", resp.StatusCode, body)
	}
	if pkgResp.Package.ID == "" {
		t.Fatalf("expected created package to have an id, body=%s", body)
	}

	// 2. Generate AI offer candidates for the member (AI sidecar unroutable -> local fallback).
	var genResp struct {
		Status        string `json:"status"`
		OffersCreated []struct {
			ID     string `json:"id"`
			Status string `json:"status"`
			Source string `json:"source"`
		} `json:"offers_created"`
	}
	resp, body = doJSON(t, http.MethodPost,
		srv.URL+"/api/ai/tenants/"+fixtureTenantID+"/members/"+fixtureMemberID+"/generate-offers",
		nil, &genResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("generate offers: status=%d body=%s", resp.StatusCode, body)
	}
	if len(genResp.OffersCreated) == 0 {
		t.Fatalf("expected at least one offer to be created, body=%s", body)
	}
	for _, o := range genResp.OffersCreated {
		if o.Status != "AI_SUGGESTED" {
			t.Fatalf("expected freshly generated offer to be AI_SUGGESTED, got %s", o.Status)
		}
	}
	offerID := genResp.OffersCreated[0].ID

	// 3. It must show up in the merchant's pending-approval queue.
	var pendingResp struct {
		Status string `json:"status"`
		Offers []struct {
			ID string `json:"id"`
		} `json:"offers"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/merchant/"+fixtureTenantID+"/pending-offers", nil, &pendingResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list pending offers: status=%d body=%s", resp.StatusCode, body)
	}
	found := false
	for _, o := range pendingResp.Offers {
		if o.ID == offerID {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected offer %s to be in the pending queue, body=%s", offerID, body)
	}

	// 4. Before approval, the customer's magic-token portal must NOT show this offer yet —
	// AI suggesting something is not the same as it being offered to a customer.
	var beforeApprove struct {
		SmartOptions []struct {
			ID string `json:"id"`
		} `json:"smart_options"`
	}
	resp, body = doJSON(t, http.MethodGet,
		srv.URL+"/api/member/resolve-magic-token?member_id="+fixtureMemberID, nil, &beforeApprove)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("resolve-magic-token before approval: status=%d body=%s", resp.StatusCode, body)
	}
	for _, o := range beforeApprove.SmartOptions {
		if o.ID == offerID {
			t.Fatalf("offer %s must not be visible to the customer before merchant approval", offerID)
		}
	}

	// 5. Merchant staff approves it.
	var approveResp struct {
		Status string `json:"status"`
		Offer  struct {
			Status string `json:"status"`
		} `json:"offer"`
	}
	resp, body = doJSON(t, http.MethodPost,
		srv.URL+"/api/merchant/"+fixtureTenantID+"/offers/"+offerID+"/approve",
		gin.H{"approved_by": "staff-integration-test"}, &approveResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("approve offer: status=%d body=%s", resp.StatusCode, body)
	}
	if approveResp.Offer.Status != "MERCHANT_APPROVED" {
		t.Fatalf("expected MERCHANT_APPROVED, got %s (body=%s)", approveResp.Offer.Status, body)
	}

	// 6. NOW the customer's portal must show exactly this offer.
	var afterApprove struct {
		SmartOptions []struct {
			ID                 string  `json:"id"`
			PriceAdjustmentIDR float64 `json:"price_adjustment_idr"`
		} `json:"smart_options"`
	}
	resp, body = doJSON(t, http.MethodGet,
		srv.URL+"/api/member/resolve-magic-token?member_id="+fixtureMemberID, nil, &afterApprove)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("resolve-magic-token after approval: status=%d body=%s", resp.StatusCode, body)
	}
	var matched *struct {
		ID                 string  `json:"id"`
		PriceAdjustmentIDR float64 `json:"price_adjustment_idr"`
	}
	for i := range afterApprove.SmartOptions {
		if afterApprove.SmartOptions[i].ID == offerID {
			matched = &afterApprove.SmartOptions[i]
		}
	}
	if matched == nil {
		t.Fatalf("expected offer %s to be visible to the customer after approval, body=%s", offerID, body)
	}

	// 7. Customer checks out against the approved offer.
	var checkoutResp struct {
		Status   string  `json:"status"`
		TrxID    string  `json:"trx_id"`
		VANumber string  `json:"va_number"`
		Amount   float64 `json:"amount"`
	}
	resp, body = doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", gin.H{
		"member_id":   fixtureMemberID,
		"ai_offer_id": offerID,
	}, &checkoutResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("checkout-va: status=%d body=%s", resp.StatusCode, body)
	}
	if checkoutResp.TrxID == "" || checkoutResp.VANumber == "" {
		t.Fatalf("expected trx_id and va_number, body=%s", body)
	}
	if checkoutResp.Amount != matched.PriceAdjustmentIDR {
		t.Fatalf("expected checkout amount %.2f to match the approved offer's locked price %.2f",
			checkoutResp.Amount, matched.PriceAdjustmentIDR)
	}

	// 8. BNI webhook settles the transaction — an invoice must be issued in the same
	// response, matching the locked offer price.
	var webhookResp struct {
		Status  string `json:"status"`
		Invoice struct {
			InvoiceNumber string  `json:"invoice_number"`
			TrxID         string  `json:"trx_id"`
			AmountIDR     float64 `json:"amount_idr"`
		} `json:"invoice"`
	}
	resp, body = doJSON(t, http.MethodPost, srv.URL+"/webhook/bni-payment", gin.H{
		"trx_id": checkoutResp.TrxID,
	}, &webhookResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("webhook settle: status=%d body=%s", resp.StatusCode, body)
	}
	if webhookResp.Status != "success" {
		t.Fatalf("expected webhook settle status=success, got %q (body=%s)", webhookResp.Status, body)
	}
	if webhookResp.Invoice.InvoiceNumber == "" || webhookResp.Invoice.TrxID != checkoutResp.TrxID {
		t.Fatalf("expected an invoice for trx %s in the settle response, body=%s", checkoutResp.TrxID, body)
	}
	if webhookResp.Invoice.AmountIDR != matched.PriceAdjustmentIDR {
		t.Fatalf("expected invoice amount %.2f to match the locked offer price %.2f",
			webhookResp.Invoice.AmountIDR, matched.PriceAdjustmentIDR)
	}

	// 9. A duplicate webhook delivery for the same trx_id must not double-process, and must
	// still return the SAME invoice (not a second one).
	var webhookResp2 struct {
		Status  string `json:"status"`
		Invoice struct {
			InvoiceNumber string `json:"invoice_number"`
		} `json:"invoice"`
	}
	resp, body = doJSON(t, http.MethodPost, srv.URL+"/webhook/bni-payment", gin.H{
		"trx_id": checkoutResp.TrxID,
	}, &webhookResp2)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("duplicate webhook: status=%d body=%s", resp.StatusCode, body)
	}
	if webhookResp2.Status != "ALREADY_PROCESSED" {
		t.Fatalf("expected duplicate webhook to report ALREADY_PROCESSED, got %q (body=%s)", webhookResp2.Status, body)
	}
	if webhookResp2.Invoice.InvoiceNumber != webhookResp.Invoice.InvoiceNumber {
		t.Fatalf("expected the same invoice_number on duplicate webhook, got %q vs %q",
			webhookResp2.Invoice.InvoiceNumber, webhookResp.Invoice.InvoiceNumber)
	}

	// 10. The customer can fetch the receipt directly, and it shows up in their invoice history.
	var getInvoiceResp struct {
		Status  string `json:"status"`
		Invoice struct {
			InvoiceNumber string `json:"invoice_number"`
			ItemTitle     string `json:"item_title"`
			CustomerName  string `json:"customer_name"`
			MerchantName  string `json:"merchant_name"`
		} `json:"invoice"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/member/invoices/"+checkoutResp.TrxID, nil, &getInvoiceResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("get invoice: status=%d body=%s", resp.StatusCode, body)
	}
	if getInvoiceResp.Invoice.InvoiceNumber != webhookResp.Invoice.InvoiceNumber {
		t.Fatalf("expected GetInvoice to return the same invoice issued at settle time")
	}
	if getInvoiceResp.Invoice.CustomerName == "" || getInvoiceResp.Invoice.MerchantName == "" {
		t.Fatalf("expected invoice to carry customer/merchant names, body=%s", body)
	}

	var listResp struct {
		Status   string `json:"status"`
		Invoices []struct {
			TrxID string `json:"trx_id"`
		} `json:"invoices"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/member/invoices?member_id="+fixtureMemberID, nil, &listResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list invoices: status=%d body=%s", resp.StatusCode, body)
	}
	foundInvoice := false
	for _, inv := range listResp.Invoices {
		if inv.TrxID == checkoutResp.TrxID {
			foundInvoice = true
		}
	}
	if !foundInvoice {
		t.Fatalf("expected member's invoice list to include trx %s, body=%s", checkoutResp.TrxID, body)
	}
}

// TestOfferLifecycle_RejectFlow: a rejected offer must never reach the customer and must
// report a clear, idempotent rejection.
func TestOfferLifecycle_RejectFlow(t *testing.T) {
	srv := newTestServer(t)

	// Seed a catalog package so this test has a candidate offer regardless of the shared
	// fixture session's remaining capacity (which other tests in this run may have consumed).
	var pkgResp struct {
		Package struct {
			ID string `json:"id"`
		} `json:"package"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/merchant/"+fixtureTenantID+"/packages", gin.H{
		"name":         uniquePackageName(t),
		"price_idr":    90000,
		"billing_type": "ONE_TIME",
	}, &pkgResp)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create package: status=%d body=%s", resp.StatusCode, body)
	}

	var genResp struct {
		OffersCreated []struct {
			ID string `json:"id"`
		} `json:"offers_created"`
	}
	resp, body = doJSON(t, http.MethodPost,
		srv.URL+"/api/ai/tenants/"+fixtureTenantID+"/members/"+fixtureMemberID+"/generate-offers",
		nil, &genResp)
	if resp.StatusCode != http.StatusOK || len(genResp.OffersCreated) == 0 {
		t.Fatalf("generate offers: status=%d body=%s", resp.StatusCode, body)
	}
	offerID := genResp.OffersCreated[0].ID

	var rejectResp struct {
		Status string `json:"status"`
		Offer  struct {
			Status          string `json:"status"`
			RejectionReason string `json:"rejection_reason"`
		} `json:"offer"`
	}
	resp, body = doJSON(t, http.MethodPost,
		srv.URL+"/api/merchant/"+fixtureTenantID+"/offers/"+offerID+"/reject",
		gin.H{"reason": "harga tidak sesuai kebijakan saat ini"}, &rejectResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("reject offer: status=%d body=%s", resp.StatusCode, body)
	}
	if rejectResp.Offer.Status != "MERCHANT_REJECTED" {
		t.Fatalf("expected MERCHANT_REJECTED, got %s", rejectResp.Offer.Status)
	}

	var afterReject struct {
		SmartOptions []struct {
			ID string `json:"id"`
		} `json:"smart_options"`
	}
	resp, body = doJSON(t, http.MethodGet,
		srv.URL+"/api/member/resolve-magic-token?member_id="+fixtureMemberID, nil, &afterReject)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("resolve-magic-token: status=%d body=%s", resp.StatusCode, body)
	}
	for _, o := range afterReject.SmartOptions {
		if o.ID == offerID {
			t.Fatalf("rejected offer %s must never be visible to the customer", offerID)
		}
	}

	// Idempotent: a second reject (or an approve) on an already-rejected offer must not
	// silently succeed as a fresh transition.
	var secondRejectResp struct {
		Status string `json:"status"`
	}
	resp, body = doJSON(t, http.MethodPost,
		srv.URL+"/api/merchant/"+fixtureTenantID+"/offers/"+offerID+"/reject",
		gin.H{"reason": "duplicate attempt"}, &secondRejectResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("second reject: status=%d body=%s", resp.StatusCode, body)
	}
	if secondRejectResp.Status != "ALREADY_PROCESSED" {
		t.Fatalf("expected ALREADY_PROCESSED on second reject, got %q", secondRejectResp.Status)
	}
}

// TestGetInvoice_NotPaidYetIsRejected: a PENDING (unpaid) transaction must not yield an
// invoice — that would let a customer print a "receipt" for something they never paid for.
func TestGetInvoice_NotPaidYetIsRejected(t *testing.T) {
	srv := newTestServer(t)

	var checkoutResp struct {
		TrxID string `json:"trx_id"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", gin.H{
		"member_id": fixtureMemberID,
		"amount":    50000,
	}, &checkoutResp)
	if resp.StatusCode != http.StatusOK || checkoutResp.TrxID == "" {
		t.Fatalf("checkout-va: status=%d body=%s", resp.StatusCode, body)
	}

	var invoiceResp struct {
		Status string `json:"status"`
		Code   string `json:"code"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/member/invoices/"+checkoutResp.TrxID, nil, &invoiceResp)
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 for unpaid transaction invoice, got %d body=%s", resp.StatusCode, body)
	}
	if invoiceResp.Code != "NOT_PAID_YET" {
		t.Fatalf("expected code NOT_PAID_YET, got %q (body=%s)", invoiceResp.Code, body)
	}
}

// TestSubmitFeedback_SavedEvenWhenAISidecarUnreachable: the AI sidecar is unroutable in
// this test server (see newTestServer), so TranslateGrievance always fails — the complaint
// must still be saved with the raw text, not dropped, and must show up in both the
// member's own history and the merchant's inbox (kept separate from transaction history).
func TestSubmitFeedback_SavedEvenWhenAISidecarUnreachable(t *testing.T) {
	srv := newTestServer(t)

	var submitResp struct {
		Status   string `json:"status"`
		Feedback struct {
			ID      string `json:"id"`
			RawText string `json:"raw_text"`
			Status  string `json:"status"`
			Intent  string `json:"intent"`
		} `json:"feedback"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/feedback", gin.H{
		"member_id": fixtureMemberID,
		"message":   "Jadwal kelas paginya selalu bentrok sama jam kantor",
	}, &submitResp)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("submit feedback: status=%d body=%s", resp.StatusCode, body)
	}
	if submitResp.Feedback.RawText == "" || submitResp.Feedback.Status != "NEW" {
		t.Fatalf("expected saved feedback with raw text and status NEW, body=%s", body)
	}
	if submitResp.Feedback.Intent != "" {
		t.Fatalf("expected empty intent since AI sidecar is unreachable in this test, got %q", submitResp.Feedback.Intent)
	}

	var memberListResp struct {
		Feedback []struct {
			ID string `json:"id"`
		} `json:"feedback"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/member/feedback?member_id="+fixtureMemberID, nil, &memberListResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list member feedback: status=%d body=%s", resp.StatusCode, body)
	}
	foundInMemberList := false
	for _, f := range memberListResp.Feedback {
		if f.ID == submitResp.Feedback.ID {
			foundInMemberList = true
		}
	}
	if !foundInMemberList {
		t.Fatalf("expected submitted feedback to show up in member's own history, body=%s", body)
	}

	var merchantListResp struct {
		Feedback []struct {
			ID string `json:"id"`
		} `json:"feedback"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/merchant/"+fixtureTenantID+"/feedback", nil, &merchantListResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list merchant feedback: status=%d body=%s", resp.StatusCode, body)
	}
	foundInMerchantList := false
	for _, f := range merchantListResp.Feedback {
		if f.ID == submitResp.Feedback.ID {
			foundInMerchantList = true
		}
	}
	if !foundInMerchantList {
		t.Fatalf("expected submitted feedback to show up in merchant's inbox, body=%s", body)
	}
}

// TestListMemberTransactions_SeparateFromInvoices: transaction history must include a
// PENDING (unpaid) transaction, even though it has no invoice yet — the two endpoints are
// deliberately backed by different queries (transactions vs invoices).
func TestListMemberTransactions_SeparateFromInvoices(t *testing.T) {
	srv := newTestServer(t)

	var checkoutResp struct {
		TrxID string `json:"trx_id"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", gin.H{
		"member_id": fixtureMemberID,
		"amount":    75000,
	}, &checkoutResp)
	if resp.StatusCode != http.StatusOK || checkoutResp.TrxID == "" {
		t.Fatalf("checkout-va: status=%d body=%s", resp.StatusCode, body)
	}

	var txListResp struct {
		Transactions []struct {
			TrxID  string `json:"trx_id"`
			Status string `json:"status"`
		} `json:"transactions"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/member/transactions?member_id="+fixtureMemberID, nil, &txListResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list transactions: status=%d body=%s", resp.StatusCode, body)
	}
	found := false
	for _, tx := range txListResp.Transactions {
		if tx.TrxID == checkoutResp.TrxID {
			found = true
			if tx.Status != "PENDING" {
				t.Fatalf("expected PENDING status for unsettled transaction, got %q", tx.Status)
			}
		}
	}
	if !found {
		t.Fatalf("expected PENDING transaction %s to appear in transaction history, body=%s", checkoutResp.TrxID, body)
	}

	// No invoice should exist yet for this still-unpaid transaction.
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/member/invoices/"+checkoutResp.TrxID, nil, nil)
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 NOT_PAID_YET for invoice of unpaid transaction, got %d body=%s", resp.StatusCode, body)
	}
}

// TestGetTenantInsights_StatsPopulatedNarrativeNilWhenAIUnreachable: the merchant/RM
// insights endpoint must still return real aggregated stats (from transactions + feedback)
// even when the AI sidecar (unroutable in this test server) can't produce a narrative —
// "narrative": null rather than the whole request failing.
func TestGetTenantInsights_StatsPopulatedNarrativeNilWhenAIUnreachable(t *testing.T) {
	srv := newTestServer(t)

	// Generate at least one PAID transaction and one feedback entry for this tenant so the
	// aggregates aren't trivially all-zero.
	var checkoutResp struct {
		TrxID string `json:"trx_id"`
	}
	resp, body := doJSON(t, http.MethodPost, srv.URL+"/api/member/checkout-va", gin.H{
		"member_id": fixtureMemberID,
		"amount":    60000,
	}, &checkoutResp)
	if resp.StatusCode != http.StatusOK || checkoutResp.TrxID == "" {
		t.Fatalf("checkout-va: status=%d body=%s", resp.StatusCode, body)
	}
	resp, body = doJSON(t, http.MethodPost, srv.URL+"/webhook/bni-payment", gin.H{"trx_id": checkoutResp.TrxID}, nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("settle: status=%d body=%s", resp.StatusCode, body)
	}
	resp, body = doJSON(t, http.MethodPost, srv.URL+"/api/member/feedback", gin.H{
		"member_id": fixtureMemberID,
		"message":   "Jadwalnya kurang fleksibel buat yang kerja kantoran",
	}, nil)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("submit feedback: status=%d body=%s", resp.StatusCode, body)
	}

	var insightsResp struct {
		Status string `json:"status"`
		Stats  struct {
			TotalTransactions   int     `json:"total_transactions"`
			PaidTransactions    int     `json:"paid_transactions"`
			TotalRevenuePaidIDR float64 `json:"total_revenue_paid_idr"`
			TotalFeedbackCount  int     `json:"total_feedback_count"`
		} `json:"stats"`
		Narrative *struct {
			HealthStatus string `json:"health_status"`
		} `json:"narrative"`
	}
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/merchant/"+fixtureTenantID+"/insights", nil, &insightsResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("get insights: status=%d body=%s", resp.StatusCode, body)
	}
	if insightsResp.Stats.TotalTransactions < 1 || insightsResp.Stats.PaidTransactions < 1 {
		t.Fatalf("expected at least 1 paid transaction reflected in stats, body=%s", body)
	}
	if insightsResp.Stats.TotalRevenuePaidIDR < 60000 {
		t.Fatalf("expected revenue to include the 60000 payment just settled, body=%s", body)
	}
	if insightsResp.Stats.TotalFeedbackCount < 1 {
		t.Fatalf("expected at least 1 feedback entry reflected in stats, body=%s", body)
	}
	if insightsResp.Narrative != nil {
		t.Fatalf("expected narrative to be nil since AI sidecar is unreachable in this test, got %+v", insightsResp.Narrative)
	}

	// Same underlying data must be reachable from the BNI-facing route too.
	resp, body = doJSON(t, http.MethodGet, srv.URL+"/api/bni/tenants/"+fixtureTenantID+"/insights", nil, &insightsResp)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("get bni insights: status=%d body=%s", resp.StatusCode, body)
	}
	if insightsResp.Stats.TotalTransactions < 1 {
		t.Fatalf("expected BNI insights route to reflect the same stats, body=%s", body)
	}
}
