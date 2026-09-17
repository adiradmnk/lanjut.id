package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

type checkoutVARequest struct {
	MemberID  string  `json:"member_id"`
	SessionID string  `json:"session_id"`
	Amount    float64 `json:"amount"`
	AIOfferID string  `json:"ai_offer_id"`
}

// CheckoutVA handles POST /api/member/checkout-va
func (h *Handlers) CheckoutVA(c *gin.Context) {
	ctx := c.Request.Context()
	var body checkoutVARequest
	_ = c.ShouldBindJSON(&body)

	memberID := body.MemberID
	if memberID == "" {
		memberID = "mbr-dina-01"
	}

	member, err := h.Store.GetMember(ctx, memberID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "MEMBER_NOT_FOUND"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "member lookup failed"})
		return
	}

	tenant, err := h.Store.GetTenant(ctx, member.TenantID)
	if errors.Is(err, store.ErrNotFound) {
		tenant, err = h.Store.GetFirstTenant(ctx)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tenant lookup failed"})
		return
	}

	// If checkout is against an approved ai_offer, its locked terms win over anything the
	// client sent — the client only supplies which offer it's paying for.
	var offerID *string
	if body.AIOfferID != "" {
		offer, err := h.Store.GetAIOffer(ctx, body.AIOfferID)
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "offer not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "offer lookup failed"})
			return
		}
		if offer.Status != "MERCHANT_APPROVED" {
			c.JSON(http.StatusConflict, gin.H{
				"status":  "error",
				"code":    "OFFER_NOT_APPROVED",
				"message": "Penawaran ini belum disetujui merchant atau statusnya sudah berubah.",
			})
			return
		}
		body.Amount = offer.PriceIDR
		if offer.TargetSessionID != nil {
			body.SessionID = *offer.TargetSessionID
		}
		offerID = &offer.ID
	}

	var session *models.ClassSession
	if body.SessionID != "" {
		session, _ = h.Store.GetSession(ctx, body.SessionID)
	}
	if session == nil {
		sessions, _ := h.Store.ListAvailableSessions(ctx, member.TenantID)
		if len(sessions) > 0 {
			session = &sessions[0]
		}
	}

	amount := body.Amount
	if amount == 0 {
		amount = 67500
	}

	sessionID, sessionTitle := "ses-general", "Sesi Membership"
	if session != nil {
		sessionID, sessionTitle = session.ID, session.Title
	}

	// Adapter chosen by tenant.PaymentProvider (defaults to BNI for every existing tenant),
	// not hardcoded — see paymentAdapterFor (handlers.go) / services/paymentgateway.go.
	adapter := h.paymentAdapterFor(tenant)
	result, err := adapter.CreatePaymentInstruction(ctx, services.CreatePaymentRequest{
		MemberID:      member.ID,
		TenantID:      tenant.ID,
		SessionID:     sessionID,
		SessionTitle:  sessionTitle,
		AmountIDR:     amount,
		CustomerName:  member.Name,
		CustomerEmail: member.Email,
		CustomerPhone: member.Phone,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "payment gateway call failed"})
		return
	}

	// FASE 1b audit trail: REQUEST and RESPONSE, as built (and already redacted) by the
	// adapter itself. Additive/best-effort — a logging failure never blocks checkout.
	provider := "BNI"
	if tenant.PaymentProvider != "" {
		provider = tenant.PaymentProvider
	}
	trxIDForLog := result.TrxID
	if err := h.Store.CreatePaymentGatewayLog(ctx, &trxIDForLog, provider, "REQUEST", result.RequestLog); err != nil {
		slog.Warn("failed to record payment gateway REQUEST log", "trx_id", result.TrxID, "err", err.Error())
	}
	if err := h.Store.CreatePaymentGatewayLog(ctx, &trxIDForLog, provider, "RESPONSE", result.ResponseLog); err != nil {
		slog.Warn("failed to record payment gateway RESPONSE log", "trx_id", result.TrxID, "err", err.Error())
	}

	if result.Status == "GATEWAY_ERROR" {
		c.JSON(http.StatusConflict, gin.H{"status": "error", "code": "GATEWAY_ERROR", "message": result.Error})
		return
	}

	if err := h.Store.CreatePendingTransaction(ctx, models.Transaction{
		TrxID:            result.TrxID,
		TenantID:         tenant.ID,
		MemberID:         member.ID,
		SessionID:        sessionID,
		SessionTitle:     sessionTitle,
		Amount:           result.AmountIDR,
		VANumber:         result.ProviderRef,
		Signature:        result.Signature,
		AIOfferID:        offerID,
		ProviderMetadata: result.RawMetadata,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to persist transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"trx_id":        result.TrxID,
		"merchant_id":   tenant.ID,
		"merchant_name": tenant.BusinessName,
		"va_number":     result.ProviderRef,
		"amount":        result.AmountIDR,
		"expired_at":    result.ExpiredAt,
		"bni_signature": result.Signature,
	})
}

type cancelCheckoutRequest struct {
	MemberID string `json:"member_id"`
}

// CancelCheckout handles POST /api/member/checkout/:trxId/cancel.
// The customer generated a VA but changed their mind before paying. Only a still-PENDING
// transaction can be cancelled; releases any reservation tied to its ai_offer so the slot
// frees up for someone else instead of sitting held forever.
func (h *Handlers) CancelCheckout(c *gin.Context) {
	ctx := c.Request.Context()
	trxID := c.Param("trxId")

	var body cancelCheckoutRequest
	_ = c.ShouldBindJSON(&body)

	trx, err := h.Store.GetTransaction(ctx, trxID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "transaction not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "transaction lookup failed"})
		return
	}
	if body.MemberID != "" && trx.MemberID != body.MemberID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "transaction does not belong to this member"})
		return
	}

	updated, alreadyProcessed, err := h.Store.CancelTransaction(ctx, trxID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to cancel transaction"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Transaksi ini sudah tidak berstatus pending (sudah lunas, dibatalkan, atau kedaluwarsa sebelumnya).",
			"trx":     updated,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Checkout dibatalkan. Slot yang tadinya ditahan sudah dilepas kembali.",
		"trx":     updated,
	})
}

// nilIfEmpty is a small helper for the loose (nullable) transaction_id reference on
// payment_gateway_logs (FASE 1b) — an empty trx id should be stored as SQL NULL, not "".
func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// redactMidtransWebhookPayload strips signature_key before a Midtrans webhook payload is
// ever written to payment_gateway_logs — redaction happens here, at the point of writing,
// not at read time. Falls back to a generic placeholder if the payload isn't valid JSON
// (ParseWebhook would already have rejected it by the time this is called, but this
// function must never itself write an unredacted signature even in that case).
func redactMidtransWebhookPayload(rawBody []byte) json.RawMessage {
	var generic map[string]any
	if err := json.Unmarshal(rawBody, &generic); err != nil {
		return json.RawMessage(`{"note":"unparseable webhook payload, not logged verbatim"}`)
	}
	if _, ok := generic["signature_key"]; ok {
		generic["signature_key"] = "[REDACTED]"
	}
	redacted, err := json.Marshal(generic)
	if err != nil {
		return json.RawMessage(`{"note":"failed to re-marshal redacted payload"}`)
	}
	return redacted
}

type webhookRequest struct {
	TrxID       string  `json:"trx_id"`
	VANumber    string  `json:"va_number"`
	MemberID    string  `json:"member_id"`
	OptionTitle string  `json:"option_title"`
	Amount      float64 `json:"amount"`
}

// BNIWebhook handles POST /webhook/bni-payment (and its alias POST /api/bni/va-webhook).
// Parses/normalizes via the BNI PaymentGatewayAdapter, then settles through the exact same
// settleAndRespond path MidtransWebhook uses — idempotency logic lives in one place
// (store.SettleTransaction), never duplicated per provider.
func (h *Handlers) BNIWebhook(c *gin.Context) {
	ctx := c.Request.Context()
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid webhook payload"})
		return
	}

	event, err := h.BNI.ParseWebhook(ctx, rawBody, c.Request.Header)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid webhook payload"})
		return
	}

	// FASE 1b audit trail: recorded before SettleTransaction is processed. This sandbox
	// payload carries no signature/api-key to redact (see bnipayment.go ParseWebhook's
	// ASUMSI) — logged as-is.
	if err := h.Store.CreatePaymentGatewayLog(ctx, nilIfEmpty(event.InternalTrxID), "BNI", "WEBHOOK", rawBody); err != nil {
		slog.Warn("failed to record payment gateway WEBHOOK log", "err", err.Error())
	}

	trxID := event.InternalTrxID
	if trxID == "" && event.ProviderRef != "" {
		// Free-activation options (freeze/flexible downgrade) settle directly against a
		// va_number without going through /checkout-va first, so synthesize a transaction.
		// BNI/demo-specific quirk: needs member_id/option_title, which a
		// NormalizedPaymentEvent deliberately doesn't carry (those aren't generic across
		// providers), so re-read them from the raw body here.
		var extra webhookRequest
		_ = json.Unmarshal(rawBody, &extra)

		trxID = "TRX-DEMO-" + event.ProviderRef
		memberID := extra.MemberID
		if memberID == "" {
			memberID = "mbr-dina-01"
		}
		member, err := h.Store.GetMember(ctx, memberID)
		if errors.Is(err, store.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "member not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "member lookup failed"})
			return
		}
		sessionTitle := extra.OptionTitle
		if sessionTitle == "" {
			sessionTitle = "Aktivasi Membership"
		}
		if err := h.Store.CreatePendingTransaction(ctx, models.Transaction{
			TrxID:        trxID,
			TenantID:     member.TenantID,
			MemberID:     member.ID,
			SessionID:    "ses-flex-any",
			SessionTitle: sessionTitle,
			Amount:       event.AmountIDR,
			VANumber:     event.ProviderRef,
			Signature:    "VALIDATED_HMAC",
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to persist transaction"})
			return
		}
	}
	if trxID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "trx_id or va_number is required"})
		return
	}

	h.settleAndRespond(c, trxID)
}

// MidtransWebhook handles POST /webhook/midtrans. Non-PAID notifications (pending/expire/
// deny/cancel/failure) are acknowledged but not settled — only a normalized PAID event ever
// reaches store.SettleTransaction, the same function BNIWebhook uses.
func (h *Handlers) MidtransWebhook(c *gin.Context) {
	ctx := c.Request.Context()
	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid webhook payload"})
		return
	}

	event, err := h.Midtrans.ParseWebhook(ctx, rawBody, c.Request.Header)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid webhook signature or payload"})
		return
	}
	if event.InternalTrxID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "order_id is required"})
		return
	}

	// FASE 1b audit trail: recorded before SettleTransaction is processed. Unlike BNI's
	// sandbox payload, Midtrans's notification carries a real signature_key — redacted here
	// before it's ever written, same "redact at the point of writing" rule as the adapters.
	if err := h.Store.CreatePaymentGatewayLog(ctx, nilIfEmpty(event.InternalTrxID), "MIDTRANS", "WEBHOOK", redactMidtransWebhookPayload(rawBody)); err != nil {
		slog.Warn("failed to record payment gateway WEBHOOK log", "err", err.Error())
	}

	if event.Status != services.PaymentStatusPaid {
		c.JSON(http.StatusOK, gin.H{"status": "acknowledged", "midtrans_status": string(event.Status)})
		return
	}

	h.settleAndRespond(c, event.InternalTrxID)
}

// settleAndRespond is the ONE place both webhook handlers call to settle a transaction and
// build the response — idempotency (store.SettleTransaction) and invoice generation are
// never duplicated per provider.
func (h *Handlers) settleAndRespond(c *gin.Context, trxID string) {
	ctx := c.Request.Context()

	trx, alreadyProcessed, err := h.Store.SettleTransaction(ctx, trxID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "transaction not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "settle failed"})
		return
	}

	if alreadyProcessed {
		invoice, _ := h.ensureInvoiceForTransaction(ctx, trxID)
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Transaksi ini telah lunas sebelumnya. Saldo dan kuota tidak diduplikasi.",
			"trx":     trx,
			"invoice": invoice,
		})
		return
	}

	member, _ := h.Store.GetMember(ctx, trx.MemberID)

	// Best-effort: the payment itself is already settled and must not be rolled back or
	// reported as failed just because invoice generation hiccups. GetInvoice can always
	// regenerate it lazily afterward.
	invoice, err := h.ensureInvoiceForTransaction(ctx, trxID)
	if err != nil {
		slog.Warn("invoice generation failed after settle", "trx_id", trxID, "err", err.Error())
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Pembayaran BNI Virtual Account berhasil diselesaikan & tervalidasi!",
		"member_updated": gin.H{
			"id":              member.ID,
			"name":            member.Name,
			"current_package": member.CurrentPackage,
			"churn_risk_flag": member.ChurnRiskFlag,
		},
		"invoice": invoice,
	})
}
