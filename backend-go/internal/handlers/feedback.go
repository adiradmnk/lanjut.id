package handlers

// Customer feedback/grievance, translated into structured intent by the AI sidecar, and
// transaction history. Deliberately separate endpoints from invoices (invoices.go): a
// transaction exists the moment a VA is issued, an invoice only once it's actually settled,
// and feedback is a distinct concern from either.

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/store"
)

type submitFeedbackRequest struct {
	MemberID string `json:"member_id" binding:"required"`
	Message  string `json:"message" binding:"required"`
}

// SubmitFeedback handles POST /api/member/feedback. The complaint is run through the AI
// sidecar's grievance translator for structured intent (schedule conflict, price-sensitive,
// etc.), but the raw text is saved regardless of whether that translation succeeds — a
// customer's complaint is never lost just because the AI sidecar hiccuped.
func (h *Handlers) SubmitFeedback(c *gin.Context) {
	ctx := c.Request.Context()

	var body submitFeedbackRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "member_id and message are required"})
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

	fb, err := h.translateAndSaveFeedback(ctx, member, body.Message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to save feedback"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "success", "feedback": fb})
}

// translateAndSaveFeedback runs a complaint through the AI sidecar's grievance translator
// and persists it regardless of whether that translation succeeds — a customer's complaint
// is never lost just because the AI sidecar hiccuped. Shared by SubmitFeedback and the
// legacy-compatible TranslateGrievance handler below.
func (h *Handlers) translateAndSaveFeedback(ctx context.Context, member *models.Member, message string) (*models.Feedback, error) {
	tenant, err := h.Store.GetTenant(ctx, member.TenantID)
	if err != nil {
		return nil, err
	}

	input := store.NewFeedbackInput{
		TenantID: member.TenantID,
		MemberID: member.ID,
		RawText:  message,
	}

	translation, err := h.AIGateway.TranslateGrievance(ctx, member.Name, message, member.CurrentPackage, tenant)
	if err != nil {
		slog.Warn("grievance translation failed; feedback saved as raw text only",
			"member_id", member.ID, "err", err.Error())
	} else {
		input.Intent = translation.Intent
		input.Category = translation.Category
		input.PreferredTimeOfDay = translation.PreferredTimeOfDay
		input.ChurnRiskScore = translation.ChurnRiskScore
		input.Sentiment = translation.Sentiment
		input.RootCauseSummary = translation.RootCauseSummary
		input.RecommendedAction = translation.RecommendedAction
		input.AIEngineSource = translation.EngineSource
		if len(translation.PreferredDays) > 0 {
			if daysJSON, err := json.Marshal(translation.PreferredDays); err == nil {
				input.PreferredDays = daysJSON
			}
		}
	}

	return h.Store.CreateFeedback(ctx, input)
}

type translateGrievanceRequest struct {
	Token             string `json:"token"`
	MemberID          string `json:"member_id"`
	FreeTextComplaint string `json:"free_text_complaint" binding:"required"`
}

// TranslateGrievance handles POST /api/member/translate-grievance — the member portal's
// "AI, help me explain my complaint" box. Resolves the member the same way
// resolve-magic-token does (token or member_id), persists the complaint via
// translateAndSaveFeedback, and returns the AI's read on it as "analysis".
//
// smart_options in the response are — deliberately — the SAME merchant-approved-only set
// ResolveMagicToken returns, never a live/on-the-fly generation. A customer's complaint text
// must never be able to conjure a new offer straight into their checkout without a human
// merchant approving it first; that's the whole point of the ai_offers approval gate.
func (h *Handlers) TranslateGrievance(c *gin.Context) {
	ctx := c.Request.Context()

	var body translateGrievanceRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "free_text_complaint is required"})
		return
	}

	member, ok := h.resolveMember(c, body.Token, body.MemberID)
	if !ok {
		return
	}

	fb, err := h.translateAndSaveFeedback(ctx, member, body.FreeTextComplaint)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to save feedback"})
		return
	}

	offers, err := h.Store.ListApprovedOffersForMember(ctx, member.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "offer lookup failed"})
		return
	}
	smartOptions := make([]models.SmartOption, 0, len(offers))
	for _, o := range offers {
		smartOptions = append(smartOptions, h.offerToSmartOption(ctx, o))
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "success",
		"analysis":      fb,
		"smart_options": smartOptions,
	})
}

// ListMemberFeedback handles GET /api/member/feedback?member_id=... — a customer's own
// feedback history.
func (h *Handlers) ListMemberFeedback(c *gin.Context) {
	ctx := c.Request.Context()
	memberID := c.Query("member_id")
	if memberID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "member_id is required"})
		return
	}

	feedback, err := h.Store.ListFeedbackByMember(ctx, memberID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list feedback"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "feedback": feedback})
}

// ListMerchantFeedback handles GET /api/merchant/:tenantId/feedback — the merchant-facing
// inbox of everything customers have complained about, AI-translated where possible.
func (h *Handlers) ListMerchantFeedback(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	feedback, err := h.Store.ListFeedbackByTenant(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list feedback"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "feedback": feedback})
}

// ListMemberTransactions handles GET /api/member/transactions?member_id=... — a customer's
// full transaction history (PENDING/PAID/CANCELLED), kept separate from invoices (which
// only exist for settled ones) and from feedback.
func (h *Handlers) ListMemberTransactions(c *gin.Context) {
	ctx := c.Request.Context()
	memberID := c.Query("member_id")
	if memberID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "member_id is required"})
		return
	}

	transactions, err := h.Store.ListTransactionsByMember(ctx, memberID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list transactions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "transactions": transactions})
}
