package handlers

// Customer feedback/grievance, translated into structured intent by the AI sidecar, and
// transaction history. Deliberately separate endpoints from invoices (invoices.go): a
// transaction exists the moment a VA is issued, an invoice only once it's actually settled,
// and feedback is a distinct concern from either.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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

type merchantTriggerCancellationRequest struct {
	MemberID string `json:"member_id" binding:"required"`
}

// TriggerCancellationSurvey handles POST /api/merchant/:tenantId/cancellation-survey
// Endpoint yang di-provide untuk sistem frontend merchant ketika terjadi pembatalan / penolakan lanjut langganan.
// Mengambil data member, tenant, dan konteks transaksi riil terakhir member sebagai tumpuan prompt AI Gemini 1.5.
func (h *Handlers) TriggerCancellationSurvey(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	var body merchantTriggerCancellationRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "member_id is required"})
		return
	}

	member, err := h.Store.GetMember(ctx, body.MemberID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "member not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to lookup member"})
		return
	}

	tenant, _ := h.Store.GetTenant(ctx, tenantID)
	if tenant == nil {
		tenant, _ = h.Store.GetTenant(ctx, member.TenantID)
	}

	// Ambil konteks transaksi terakhir member
	var lastTrxContext map[string]any
	trxs, errTrx := h.Store.ListTransactionsByMember(ctx, member.ID)
	if errTrx == nil && len(trxs) > 0 {
		latest := trxs[0]
		pattern := "RECENT_ORDER_CANCELED"
		if latest.Status == "PENDING" {
			pattern = "UNPAID_PENDING_VA"
		} else if latest.Status == "PAID" {
			pattern = "ACTIVE_MEMBER_TERMINATION"
		} else if latest.Status == "CANCELLED" || latest.Status == "EXPIRED" {
			pattern = "EXPIRED_UNPAID_INVOICE"
		}

		lastTrxContext = map[string]any{
			"trx_id":           latest.TrxID,
			"session_id":       latest.SessionID,
			"session_title":    latest.SessionTitle,
			"amount_idr":       latest.Amount,
			"status":           latest.Status,
			"created_at":       latest.CreatedAt,
			"paid_at":          latest.PaidAt,
			"detected_pattern": pattern,
			"days_to_expiry":   7,
			"unused_quota":     member.TotalQuota - member.UsedQuota,
		}
	} else if tenant != nil {
		var defaultAmount float64 = tenant.Config.MinMarginFloorIDR
		var defaultTitle string = "Membership " + tenant.BusinessName
		pkgs, errPkg := h.Store.ListActiveProductPackages(ctx, tenant.ID)
		if errPkg == nil && len(pkgs) > 0 {
			defaultAmount = pkgs[0].PriceIDR
			defaultTitle = pkgs[0].Name
		}
		lastTrxContext = map[string]any{
			"trx_id":           "TRX-CATALOG-ACTIVE",
			"session_title":    defaultTitle,
			"amount_idr":       defaultAmount,
			"status":           "CATALOG_ACTIVE",
			"detected_pattern": "NON_RENEWAL_EXPIRY",
			"days_to_expiry":   7,
			"unused_quota":     member.TotalQuota - member.UsedQuota,
		}
	} else {
		lastTrxContext = map[string]any{
			"amount_idr":       150000.0,
			"status":           "EXPIRED",
			"detected_pattern": "EXPIRED_UNPAID_INVOICE",
			"days_to_expiry":   7,
			"unused_quota":     0,
		}
	}

	survey, err := h.AIGateway.GenerateCancellationSurvey(ctx, member, tenant, lastTrxContext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to generate survey"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":                 "success",
		"member_id":              member.ID,
		"member_name":            member.Name,
		"last_transaction":       lastTrxContext,
		"survey":                 survey,
		"feedback_submission_url": fmt.Sprintf("/api/member/subscription/%s/feedback", member.ID),
	})
}
