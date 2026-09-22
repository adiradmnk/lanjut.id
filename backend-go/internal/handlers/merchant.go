package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/store"
)

// MerchantDashboard handles GET /api/merchant/:tenantId/dashboard
func (h *Handlers) MerchantDashboard(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	if tenantID == "" {
		tenantID = c.Query("merchant_id")
	}
	if tenantID == "" {
		tenantID = "mch-fitbody-01"
	}

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		tenant, err = h.Store.GetFirstTenant(ctx)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "tenant lookup failed"})
		return
	}

	members, err := h.Store.ListMembersByTenant(ctx, tenant.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "member lookup failed"})
		return
	}

	atRisk, saved := 0, 0
	for _, m := range members {
		switch m.ChurnRiskFlag {
		case "HIGH":
			atRisk++
		case "LOW":
			saved++
		}
	}
	totalMembers := len(members)
	if totalMembers == 0 {
		totalMembers = 1
	}
	retentionRate := float64(saved) / float64(totalMembers) * 100

	// Real aggregates (revenue, quota utilization, VA settlement) come from the same
	// store.GetTenantInsightStats used by the BNI credit-dss/merchant-list endpoints, so the
	// merchant dashboard's stat cards show actual transaction/quota data instead of only the
	// member-count-derived fields above. Added alongside the original fields (rather than
	// replacing them) since baseline_test.go pins their exact names.
	insightStats, err := h.Store.GetTenantInsightStats(ctx, tenant.ID)
	if err != nil {
		insightStats = &store.TenantInsightStats{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"merchant": gin.H{
			"id":            tenant.ID,
			"business_name": tenant.BusinessName,
			"category":      tenant.Category,
			"config":        tenant.Config,
		},
		"stats": gin.H{
			"total_active_members": len(members),
			"members_at_risk":      atRisk,
			"members_saved_by_ai":  saved,
			"retention_rate_pct":   retentionRate,
			"saved_revenue_idr":    float64(saved) * (tenant.Config.MinMarginFloorIDR * 4),

			// Aliases matching the frontend's MerchantStats shape (merchant/page.tsx).
			"total_members":             len(members),
			"at_risk_members":           atRisk,
			"saved_members":             saved,
			"total_revenue_paid_idr":    insightStats.TotalRevenuePaidIDR,
			"avg_quota_utilization_pct": insightStats.AvgQuotaUtilizationPct,
			"outreach_sent":             insightStats.OutreachSent,
			"magic_link_opened":         insightStats.MagicLinkOpened,
			"va_settled":                insightStats.VaSettled,
		},
	})
}

// MerchantAtRiskMembers handles GET /api/merchant/:tenantId/at-risk-members
func (h *Handlers) MerchantAtRiskMembers(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	if tenantID == "" {
		tenantID = c.Query("merchant_id")
	}
	if tenantID == "" {
		tenantID = "mch-fitbody-01"
	}

	members, err := h.Store.ListMembersByTenant(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "member lookup failed"})
		return
	}

	sessions, _ := h.Store.ListAvailableSessions(ctx, tenantID)
	allTenants, _ := h.Store.ListTenants(ctx)
	tenantsBrief := make([]gin.H, 0, len(allTenants))
	for _, t := range allTenants {
		tenantsBrief = append(tenantsBrief, gin.H{"id": t.ID, "name": t.BusinessName, "category": t.Category})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":             true,
		"current_merchant_id": tenantID,
		"all_tenants":         tenantsBrief,
		"members":             members,
		"total_members":       len(members),
		"sessions":            sessions,
	})
}

// BNIDashboard handles GET /api/bni/dashboard
func (h *Handlers) BNIDashboard(c *gin.Context) {
	ctx := c.Request.Context()
	tenants, err := h.Store.ListTenants(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "tenant lookup failed"})
		return
	}

	var totalExposure, totalInstallment float64
	for _, t := range tenants {
		totalExposure += t.LoanPlafondIDR
		totalInstallment += t.MonthlyInstallmentIDR
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"portfolio": gin.H{
			"total_sme_merchants_supervised": len(tenants),
			"total_loan_exposure_idr":        totalExposure,
			"total_monthly_installment_idr":  totalInstallment,
		},
	})
}

// UpdateMerchantConfig handles PATCH /api/merchant/:tenantId/config
func (h *Handlers) UpdateMerchantConfig(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantId is required"})
		return
	}

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to lookup tenant"})
		return
	}

	var payload struct {
		MaxDiscountPct    *float64 `json:"max_discount_allowed_pct"`
		MinMarginFloorIDR *float64 `json:"min_margin_floor_idr"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	if payload.MaxDiscountPct != nil {
		tenant.Config.MaxDiscountPct = *payload.MaxDiscountPct
	}
	if payload.MinMarginFloorIDR != nil {
		tenant.Config.MinMarginFloorIDR = *payload.MinMarginFloorIDR
	}

	if err := h.Store.UpdateTenantConfig(ctx, tenant.ID, tenant.Config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update tenant config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "config": tenant.Config})
}

// GetMerchantChurnEvents handles GET /api/merchant/:tenantId/churn-events
func (h *Handlers) GetMerchantChurnEvents(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	if tenantID == "" {
		tenantID = "mch-fitbody-01"
	}

	events, err := h.Store.ListChurnEventsByTenant(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "failed to load churn events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"events":  events,
	})
}

// GetMerchantRevenueInsights handles GET /api/merchant/:tenantId/revenue-insights
func (h *Handlers) GetMerchantRevenueInsights(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	if tenantID == "" {
		tenantID = "mch-fitbody-01"
	}

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get tenant"})
		return
	}

	stats, _ := h.Store.GetTenantInsightStats(ctx, tenantID)
	totalMembers := stats.TotalMembers
	if totalMembers == 0 {
		totalMembers = 100 // fallback mock
	}
	atRisk := stats.AtRiskMembers
	saved := stats.SavedMembers

	transactions, _ := h.Store.ListTransactionsByTenant(ctx, tenantID, store.TransactionFilter{})
	feedback, _ := h.Store.ListFeedbackByTenant(ctx, tenantID)
	feedbackForAI := make([]map[string]any, 0, len(feedback))
	for _, f := range feedback {
		feedbackForAI = append(feedbackForAI, map[string]any{
			"member_id":          f.MemberID,
			"raw_text":           f.RawText,
			"category":           f.Category,
			"sentiment":          f.Sentiment,
			"churn_risk_score":   f.ChurnRiskScore,
			"root_cause_summary": f.RootCauseSummary,
			"recommended_action": f.RecommendedAction,
			"created_at":         f.CreatedAt,
		})
	}

	insights, err := h.AIGateway.GetMerchantRevenueInsights(ctx, tenant, totalMembers, atRisk, saved, feedbackForAI, redactTransactionsForAnalytics(transactions))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate insights"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"insights": insights,
	})
}
