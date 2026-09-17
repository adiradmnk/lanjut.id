package handlers

import (
	"errors"
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

	result := h.BNI.CreateVirtualAccount(ctx, services.CreateVARequest{
		MemberID:      member.ID,
		TenantID:      tenant.ID,
		SessionID:     sessionID,
		SessionTitle:  sessionTitle,
		AmountIDR:     amount,
		CustomerName:  member.Name,
		CustomerEmail: member.Email,
		CustomerPhone: member.Phone,
	})

	if result.Status == "GATEWAY_ERROR" {
		c.JSON(http.StatusConflict, gin.H{"status": "error", "code": "GATEWAY_ERROR", "message": result.Error})
		return
	}

	if err := h.Store.CreatePendingTransaction(ctx, models.Transaction{
		TrxID:        result.TrxID,
		TenantID:     tenant.ID,
		MemberID:     member.ID,
		SessionID:    sessionID,
		SessionTitle: sessionTitle,
		Amount:       result.Amount,
		VANumber:     result.VANumber,
		Signature:    result.Signature,
		AIOfferID:    offerID,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to persist transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"trx_id":        result.TrxID,
		"merchant_id":   tenant.ID,
		"merchant_name": tenant.BusinessName,
		"va_number":     result.VANumber,
		"amount":        result.Amount,
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

type webhookRequest struct {
	TrxID       string  `json:"trx_id"`
	VANumber    string  `json:"va_number"`
	MemberID    string  `json:"member_id"`
	OptionTitle string  `json:"option_title"`
	Amount      float64 `json:"amount"`
}

// BNIWebhook handles POST /webhook/bni-payment.
// Signature-verified in production; here we trust the trx_id lookup and rely on the
// idempotency UNIQUE constraint to make double-delivery a no-op.
func (h *Handlers) BNIWebhook(c *gin.Context) {
	ctx := c.Request.Context()
	var body webhookRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid webhook payload"})
		return
	}

	trxID := body.TrxID
	if trxID == "" && body.VANumber != "" {
		// Free-activation options (freeze/flexible downgrade) settle directly against a
		// va_number without going through /checkout-va first, so synthesize a transaction.
		trxID = "TRX-DEMO-" + body.VANumber
		memberID := body.MemberID
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
		sessionTitle := body.OptionTitle
		if sessionTitle == "" {
			sessionTitle = "Aktivasi Membership"
		}
		if err := h.Store.CreatePendingTransaction(ctx, models.Transaction{
			TrxID:        trxID,
			TenantID:     member.TenantID,
			MemberID:     member.ID,
			SessionID:    "ses-flex-any",
			SessionTitle: sessionTitle,
			Amount:       body.Amount,
			VANumber:     body.VANumber,
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
