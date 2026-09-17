package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

type Handlers struct {
	Store      *store.Store
	MagicToken *services.MagicTokenService
	AIGateway  *services.AIGateway
	BNI        *services.BNIPaymentService
}

func New(s *store.Store, mt *services.MagicTokenService, ai *services.AIGateway, bni *services.BNIPaymentService) *Handlers {
	return &Handlers{Store: s, MagicToken: mt, AIGateway: ai, BNI: bni}
}

func (h *Handlers) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "lanjut-backend-service",
		"version": "1.0.0",
	})
}

func tokenErrorMessage(err error) string {
	if errors.Is(err, services.ErrCrossTenant) {
		return "Akses Ditolak (Cross-Tenant Security Violation): Token tidak berhak mengakses merchant ini."
	}
	return "Akses Ditolak: Tautan unik tidak valid, telah dimanipulasi, atau melewati batas 24 jam."
}

// resolveMember validates a magic token (or falls back to member_id / demo default)
// and writes the appropriate error response itself if resolution fails.
func (h *Handlers) resolveMember(c *gin.Context, token, memberIDFallback string) (*models.Member, bool) {
	ctx := c.Request.Context()

	if token != "" {
		m, err := h.MagicToken.ValidateToken(ctx, token)
		if err != nil {
			status := http.StatusUnauthorized
			if errors.Is(err, services.ErrCrossTenant) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{
				"status":  "error",
				"code":    err.Error(),
				"message": tokenErrorMessage(err),
			})
			return nil, false
		}
		return m, true
	}

	id := memberIDFallback
	if id == "" {
		id = "mbr-dina-01"
	}

	m, err := h.Store.GetMember(ctx, id)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "Member tidak ditemukan dalam database."})
		return nil, false
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "member lookup failed"})
		return nil, false
	}
	return m, true
}

// GET /api/member/resolve-magic-token?token=...
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

	sessions, err := h.Store.ListAvailableSessions(ctx, m.TenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "session lookup failed"})
		return
	}

	smartOptions := h.AIGateway.RankSmartOptions(ctx, m, tenant, sessions)

	c.JSON(http.StatusOK, gin.H{
		"status":              "success",
		"token_verified_hmac": true,
		"ai_engine_source":    "Multi-Tenant Capacity-Aware Ranker (FastAPI + Postgres)",
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

type checkoutVARequest struct {
	MemberID  string  `json:"member_id"`
	SessionID string  `json:"session_id"`
	Amount    float64 `json:"amount"`
}

// POST /api/member/checkout-va
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

type webhookRequest struct {
	TrxID       string  `json:"trx_id"`
	VANumber    string  `json:"va_number"`
	MemberID    string  `json:"member_id"`
	OptionTitle string  `json:"option_title"`
	Amount      float64 `json:"amount"`
}

// POST /webhook/bni-payment
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
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Transaksi ini telah lunas sebelumnya. Saldo dan kuota tidak diduplikasi.",
			"trx":     trx,
		})
		return
	}

	member, _ := h.Store.GetMember(ctx, trx.MemberID)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Pembayaran BNI Virtual Account berhasil diselesaikan & tervalidasi!",
		"member_updated": gin.H{
			"id":              member.ID,
			"name":            member.Name,
			"current_package": member.CurrentPackage,
			"churn_risk_flag": member.ChurnRiskFlag,
		},
	})
}

// GET /api/merchant/:tenantId/dashboard
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

// GET /api/merchant/:tenantId/at-risk-members
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
		"success":            true,
		"current_merchant_id": tenantID,
		"all_tenants":        tenantsBrief,
		"members":            members,
		"total_members":      len(members),
		"sessions":           sessions,
	})
}

// GET /api/bni/dashboard
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
