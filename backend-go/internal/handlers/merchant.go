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
