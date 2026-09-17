package handlers

// Merchant/BNI-RM insight dashboard: aggregates a tenant's real transaction history and
// feedback (see store.GetTenantInsightStats), then asks the AI sidecar to turn those
// aggregates into a narrative + actionable recommendations (services.AIGateway.
// GenerateRMSummary). Both audiences — merchant and BNI relationship manager — read the
// same underlying stats, just from different routes.

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

// GetTenantInsights handles GET /api/merchant/:tenantId/insights and
// GET /api/bni/tenants/:tenantId/insights. The AI narrative is best-effort: if the sidecar
// is unreachable, the raw aggregated stats are still returned with "narrative": null rather
// than failing the whole request.
func (h *Handlers) GetTenantInsights(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "tenant not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}

	stats, err := h.Store.GetTenantInsightStats(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to aggregate insight stats"})
		return
	}

	topChurnReason := stats.TopFeedbackCategory
	if topChurnReason == "" {
		topChurnReason = "Belum ada data feedback yang cukup"
	}

	summary, err := h.AIGateway.GenerateRMSummary(ctx, services.RMSummaryInput{
		MerchantName:        tenant.BusinessName,
		TotalMembers:        stats.TotalMembers,
		AtRiskMembers:       stats.AtRiskMembers,
		SavedThisMonth:      stats.SavedMembers,
		RetentionRatePct:    stats.RetentionRatePct,
		AvgAttendancePct:    stats.AvgQuotaUtilizationPct,
		TopChurnReason:      topChurnReason,
		EstBNIVATurnoverIDR: int64(stats.TotalRevenuePaidIDR),
	})
	if err != nil {
		slog.Warn("rm summary generation failed; returning raw stats only", "tenant_id", tenantID, "err", err.Error())
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"tenant": gin.H{"id": tenant.ID, "business_name": tenant.BusinessName, "category": tenant.Category},
		"stats": gin.H{
			"total_members":             stats.TotalMembers,
			"at_risk_members":           stats.AtRiskMembers,
			"saved_members":             stats.SavedMembers,
			"retention_rate_pct":        stats.RetentionRatePct,
			"avg_quota_utilization_pct": stats.AvgQuotaUtilizationPct,
			"total_transactions":        stats.TotalTransactions,
			"paid_transactions":         stats.PaidTransactions,
			"payment_success_rate_pct":  stats.PaymentSuccessRatePct,
			"total_revenue_paid_idr":    stats.TotalRevenuePaidIDR,
			"total_feedback_count":      stats.TotalFeedbackCount,
			"top_feedback_category":     topChurnReason,
		},
		"narrative": summary,
	})
}

// GetTenantCreditDSS handles GET /api/bni/tenants/:tenantId/credit-dss. It feeds the
// tenant's real loan terms and BNI VA turnover into the sidecar's DSCR calculator
// (services.AIGateway.EvaluateSMECreditDSS) so the BNI RM dashboard can show an actual
// credit-health rating instead of a hardcoded figure.
func (h *Handlers) GetTenantCreditDSS(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "tenant not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}

	stats, err := h.Store.GetTenantInsightStats(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to aggregate insight stats"})
		return
	}

	dss, err := h.AIGateway.EvaluateSMECreditDSS(ctx, services.SMECreditDSSInput{
		MerchantID:            tenant.ID,
		MerchantName:          tenant.BusinessName,
		MonthlyInstallmentIDR: int64(tenant.MonthlyInstallmentIDR),
		MonthlyVATurnoverIDR:  int64(stats.TotalRevenuePaidIDR),
		RetentionRatePct:      stats.RetentionRatePct,
		ActiveMemberCount:     stats.TotalMembers,
	})
	if err != nil {
		slog.Warn("sme credit dss evaluation failed", "tenant_id", tenantID, "err", err.Error())
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"tenant": gin.H{"id": tenant.ID, "business_name": tenant.BusinessName},
			"dss":    nil,
			"inputs": gin.H{
				"monthly_installment_idr": tenant.MonthlyInstallmentIDR,
				"monthly_va_turnover_idr": stats.TotalRevenuePaidIDR,
				"retention_rate_pct":      stats.RetentionRatePct,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"tenant": gin.H{"id": tenant.ID, "business_name": tenant.BusinessName},
		"dss":    dss,
	})
}
