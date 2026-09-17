package handlers

// FASE 3 — customer-side interactions. Guiding rule throughout: cancel is never gated on a
// reason, nothing here is allowed to spam (every outbound-to-customer decision goes through
// store.CanContact), and there's always a path to a human (request-human-help).

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/store"
)

// CancelSubscription handles POST /api/member/subscription/:id/cancel. :id is a member_id
// (see migration 0011's ASUMSI — this schema has no separate subscriptions table). Idempotent
// and never requires a reason up front; SubmitSubscriptionFeedback below is a separate,
// optional call.
func (h *Handlers) CancelSubscription(c *gin.Context) {
	ctx := c.Request.Context()
	memberID := c.Param("id")

	member, alreadyProcessed, err := h.Store.CancelSubscription(ctx, memberID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "member not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to cancel subscription"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Subscription ini sudah dibatalkan sebelumnya.",
			"member":  member,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Subscription dibatalkan.", "member": member})
}

type subscriptionFeedbackRequest struct {
	ReasonCode string `json:"reason_code"`
	FreeText   string `json:"free_text"`
}

// SubmitSubscriptionFeedback handles POST /api/member/subscription/:id/feedback.
// ASUMSI: maps to context_type=CANCELLATION with context_ref_id=the member/subscription id
// — the enum in migration 0011 has no dedicated "subscription feedback" value, and this is
// the natural fit given the endpoint's placement right next to cancel.
func (h *Handlers) SubmitSubscriptionFeedback(c *gin.Context) {
	ctx := c.Request.Context()
	memberID := c.Param("id")

	var body subscriptionFeedbackRequest
	_ = c.ShouldBindJSON(&body)

	member, err := h.Store.GetMember(ctx, memberID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "member not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "member lookup failed"})
		return
	}

	feedback, alreadyProcessed, err := h.Store.CreateMemberFeedback(ctx, store.NewMemberFeedbackInput{
		MemberID: member.ID, TenantID: member.TenantID,
		ContextType: "CANCELLATION", ContextRefID: memberID,
		ReasonCode: body.ReasonCode, FreeText: body.FreeText,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to save feedback"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{"status": "ALREADY_PROCESSED", "message": "Feedback untuk ini sudah pernah dikirim.", "feedback": feedback})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "feedback": feedback})
}

type receiptFeedbackRequest struct {
	ReasonCode string `json:"reason_code"`
	FreeText   string `json:"free_text"`
}

// SubmitReceiptFeedback handles POST /api/member/receipt/:trxId/feedback.
// ASUMSI: maps to context_type=PULSE_CHECK with context_ref_id=trx_id — a receipt only
// exists for an already-settled transaction (see ensureInvoiceForTransaction), so this is
// post-payment satisfaction feedback, not a payment-failure report.
func (h *Handlers) SubmitReceiptFeedback(c *gin.Context) {
	ctx := c.Request.Context()
	trxID := c.Param("trxId")

	var body receiptFeedbackRequest
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

	feedback, alreadyProcessed, err := h.Store.CreateMemberFeedback(ctx, store.NewMemberFeedbackInput{
		MemberID: trx.MemberID, TenantID: trx.TenantID,
		ContextType: "PULSE_CHECK", ContextRefID: trxID,
		ReasonCode: body.ReasonCode, FreeText: body.FreeText,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to save feedback"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{"status": "ALREADY_PROCESSED", "message": "Feedback untuk ini sudah pernah dikirim.", "feedback": feedback})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "feedback": feedback})
}

const receiptFeedbackPromptPurpose = "receipt_feedback_prompt"

// GetReceipt handles GET /api/member/receipt/:trxId — same underlying data as
// GetInvoice (invoices.go), plus a feedback_prompt field that only ever appears when
// store.CanContact clears it (so a customer is never prompted for feedback more than once
// per day, and never at all if they've opted out).
func (h *Handlers) GetReceipt(c *gin.Context) {
	ctx := c.Request.Context()
	trxID := c.Param("trxId")

	invoice, err := h.ensureInvoiceForTransaction(ctx, trxID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "transaction not found"})
		return
	}
	if errors.Is(err, errInvoiceNotPaidYet) {
		c.JSON(http.StatusConflict, gin.H{
			"status": "error", "code": "NOT_PAID_YET",
			"message": "Struk belum bisa diterbitkan karena transaksi belum lunas.",
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to load receipt"})
		return
	}

	var feedbackPrompt any
	if allowed, ceErr := h.Store.CanContact(ctx, invoice.MemberID, receiptFeedbackPromptPurpose); ceErr == nil && allowed {
		feedbackPrompt = gin.H{
			"message":    "Gimana pengalaman kamu? Kasih tau kami yuk.",
			"submit_url": "/api/member/receipt/" + trxID + "/feedback",
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"invoice":         invoice,
		"feedback_prompt": feedbackPrompt,
	})
}

type requestHumanHelpRequest struct {
	MemberID string `json:"member_id" binding:"required"`
	Issue    string `json:"issue" binding:"required"`
}

// RequestHumanHelp handles POST /api/member/request-human-help. Idempotent while a ticket
// is still OPEN — a second call doesn't create a second ticket, it returns the existing one.
func (h *Handlers) RequestHumanHelp(c *gin.Context) {
	ctx := c.Request.Context()

	var body requestHumanHelpRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "member_id and issue are required"})
		return
	}

	member, err := h.Store.GetMember(ctx, body.MemberID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "member not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "member lookup failed"})
		return
	}

	ticket, alreadyProcessed, err := h.Store.CreateSupportTicket(ctx, member.ID, member.TenantID, body.Issue)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to create support ticket"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Kamu sudah punya tiket bantuan yang masih terbuka.",
			"ticket":  ticket,
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "ticket": ticket})
}
