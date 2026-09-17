package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/store"
)

// ResolveMagicToken handles GET /api/member/resolve-magic-token?token=...
func (h *Handlers) ResolveMagicToken(c *gin.Context) {
	ctx := c.Request.Context()
	token := c.Query("token")
	memberIDFallback := c.Query("member_id")

	m, ok := h.resolveMember(c, token, memberIDFallback)
	if !ok {
		return
	}

	tenant, err := h.Store.GetTenant(ctx, m.TenantID)
	if errors.Is(err, store.ErrNotFound) {
		tenant, err = h.Store.GetFirstTenant(ctx)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}

	// Smart options shown to the customer are ONLY ai_offers a human merchant staffer has
	// already approved — never generated on the fly here. AI can propose, it cannot
	// publish; see GenerateOffers/ApproveOffer (offers.go) for the human-in-the-loop gate.
	offers, err := h.Store.ListApprovedOffersForMember(ctx, m.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "offer lookup failed"})
		return
	}
	smartOptions := make([]models.SmartOption, 0, len(offers))
	for _, o := range offers {
		smartOptions = append(smartOptions, h.offerToSmartOption(ctx, o))
	}

	c.JSON(http.StatusOK, gin.H{
		"status":              "success",
		"token_verified_hmac": true,
		"ai_engine_source":    "Merchant-approved offer queue (AI proposes, humans approve)",
		"merchant_info": gin.H{
			"id":                       tenant.ID,
			"business_name":            tenant.BusinessName,
			"category":                 tenant.Category,
			"max_discount_allowed_pct": tenant.Config.MaxDiscountPct,
		},
		"member": gin.H{
			"id":              m.ID,
			"name":            m.Name,
			"email":           m.Email,
			"phone":           m.Phone,
			"merchant_id":     m.TenantID,
			"merchant_name":   tenant.BusinessName,
			"current_package": m.CurrentPackage,
			"used_quota":      m.UsedQuota,
			"total_quota":     m.TotalQuota,
			"active_until":    m.ActiveUntil,
			"churn_risk_flag": m.ChurnRiskFlag,
		},
		"smart_options": smartOptions,
	})
}

// offerToSmartOption maps a MERCHANT_APPROVED ai_offer onto the existing SmartOption
// response shape, so the frontend member portal (which already renders SmartOption[])
// doesn't need to change to consume the new approval-gated offer flow.
func (h *Handlers) offerToSmartOption(ctx context.Context, o models.AIOffer) models.SmartOption {
	opt := models.SmartOption{
		ID:                 o.ID,
		Type:               o.Source,
		Title:              o.ProposedTitle,
		Badge:              "Disetujui Merchant",
		Description:        "Penawaran ini sudah direview dan disetujui staff merchant.",
		PriceAdjustmentIDR: o.PriceIDR,
		DiscountLabel:      fmt.Sprintf("Diskon %.0f%%", o.DiscountPct),
		ActionLabel:        "Pilih Penawaran Ini",
	}
	if o.TargetSessionID != nil {
		opt.TargetSessionID = *o.TargetSessionID
		if session, err := h.Store.GetSession(ctx, *o.TargetSessionID); err == nil {
			opt.TargetSessionTitle = session.Title
			opt.TargetSessionTime = session.DayOfWeek + ", " + session.TimeSlot
			opt.Highlight = opt.TargetSessionTime
			opt.AvailableSlots = session.TotalCapacity - session.BookedSlots
		}
	}
	return opt
}
