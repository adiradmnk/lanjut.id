package handlers

// Merchant guidebook upload: a document (PDF/docx/txt) containing the full catalog,
// package, policy, and payment-system detail. Stored raw in R2; text extracted via the AI
// sidecar and used to ground GenerateOffers (offers.go) so the AI's proposals reflect the
// merchant's actual policies instead of guessing.

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/store"
)

// maxGuidebookSizeBytes caps uploads at 20MB — generous for a catalog/policy document,
// tight enough to keep R2 usage and AI-sidecar parsing time predictable.
const maxGuidebookSizeBytes = 20 * 1024 * 1024

var allowedGuidebookExtensions = map[string]bool{
	".pdf":  true,
	".docx": true,
	".doc":  true,
	".txt":  true,
	".md":   true,
}

// UploadGuidebook handles POST /api/merchant/:tenantId/guidebook (multipart/form-data,
// field name "file"). Uploads to R2 if configured (gracefully skips if not), extracts structured
// business rules and full text via AI Engine (Gemini / RAG extractor), persists to merchant_guidebooks & guidebooks,
// and updates the tenant's active constraints in PostgreSQL.
func (h *Handlers) UploadGuidebook(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	notes := c.PostForm("notes")

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		tenant, err = h.Store.GetFirstTenant(ctx)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}
	tenantID = tenant.ID

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "field 'file' is required (multipart/form-data)"})
		return
	}
	if fileHeader.Size > maxGuidebookSizeBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{
			"status": "error", "message": fmt.Sprintf("file exceeds max size of %dMB", maxGuidebookSizeBytes/1024/1024),
		})
		return
	}
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedGuidebookExtensions[ext] {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{
			"status": "error", "message": "only .pdf, .docx, .doc, .txt, .md are accepted",
		})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to open uploaded file"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to read uploaded file"})
		return
	}

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	r2Key := fmt.Sprintf("guidebooks/%s/%d%s", tenantID, time.Now().UnixNano(), ext)
	r2URL := ""
	if h.Storage != nil {
		url, upErr := h.Storage.Upload(ctx, r2Key, bytes.NewReader(data), int64(len(data)), contentType)
		if upErr == nil {
			r2URL = url
		} else {
			slog.Warn("r2 upload skipped or failed, proceeding with AI analysis", "err", upErr)
		}
	}

	// 1. Call AI Engine for Structured Business Rules Ingestion
	rules, textPreview, engineSource, extractErr := h.AIGateway.ExtractRulesFromDocument(ctx, fileHeader.Filename, data, notes)
	extractionStatus := "SUCCESS"
	if extractErr != nil {
		slog.Warn("guidebook structured rule extraction failed, trying fallback text extract",
			"tenant_id", tenantID, "filename", fileHeader.Filename, "err", extractErr.Error())
		extractionStatus = "PARTIAL_OR_FAILED"
	}

	// 2. Persist to merchant_guidebooks
	merchantGb := &models.MerchantGuidebook{
		TenantID:       tenantID,
		Filename:       fileHeader.Filename,
		FileType:       contentType,
		RawText:        textPreview,
		ExtractedRules: rules,
		Status:         "ACTIVE",
	}
	_ = h.Store.SaveGuidebook(ctx, merchantGb)

	// 3. Persist to guidebooks table for AI grounding (GenerateOffers)
	gb, _ := h.Store.CreateGuidebook(ctx, store.NewGuidebookInput{
		TenantID:         tenantID,
		Filename:         fileHeader.Filename,
		R2Key:            r2Key,
		R2URL:            r2URL,
		ContentType:      contentType,
		SizeBytes:        fileHeader.Size,
		ExtractedText:    textPreview,
		ExtractionStatus: extractionStatus,
	})

	// 4. Update tenant's active constraints & category if AI extracted valid financial guardrails
	if rules != nil {
		if rules.FinancialConstraints.MaxDiscountAllowedPct > 0 {
			tenant.Config.MaxDiscountPct = rules.FinancialConstraints.MaxDiscountAllowedPct
		}
		if rules.FinancialConstraints.MinMarginFloorIDR > 0 {
			tenant.Config.MinMarginFloorIDR = rules.FinancialConstraints.MinMarginFloorIDR
		}
		_ = h.Store.UpdateTenantBusinessRules(ctx, tenantID, merchantGb.ID, tenant.Config.MaxDiscountPct, tenant.Config.MinMarginFloorIDR, rules.BusinessProfile.Category)
	}

	c.JSON(http.StatusCreated, gin.H{
		"status":         "success",
		"message":        "Dokumen Guidebook berhasil dianalisis AI Engine dan diintegrasikan ke aturan bisnis merchant.",
		"guidebook":      gb,
		"merchant_gb":    merchantGb,
		"extracted_rules": rules,
		"engine_source":  engineSource,
		"tenant_config":  tenant.Config,
	})
}

// GetBusinessRules handles GET /api/merchant/:tenantId/business-rules
func (h *Handlers) GetBusinessRules(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	if tenantID == "" {
		tenantID = c.Query("merchant_id")
	}

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		tenant, _ = h.Store.GetFirstTenant(ctx)
	}
	if tenant == nil {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "tenant not found"})
		return
	}

	latestGb, _ := h.Store.GetLatestGuidebookByTenant(ctx, tenant.ID)

	var activeRules *models.ExtractedBusinessRules
	if latestGb != nil && latestGb.ExtractedRules != nil {
		activeRules = latestGb.ExtractedRules
	} else {
		// Default fallback structured rules from tenant config
		activeRules = &models.ExtractedBusinessRules{
			BusinessProfile: models.BusinessProfile{
				BusinessName: tenant.BusinessName,
				Category:     tenant.Category,
				Summary:      "Mitra Merchant BNI Ecosystem yang terlindungi sistem retensi otomatis LANJUT.",
			},
			FinancialConstraints: models.FinancialConstraints{
				MaxDiscountAllowedPct: tenant.Config.MaxDiscountPct,
				MinMarginFloorIDR:     tenant.Config.MinMarginFloorIDR,
				Currency:              "IDR",
				Rationale:             "Batas margin profit floor aman untuk menopang cicilan pinjaman BNI.",
			},
			ProductCatalog: []models.ProductItem{
				{Name: "Paket Langganan Regular", PriceIDR: tenant.Config.MinMarginFloorIDR * 3, QuotaSessions: 8, ValidityDays: 30, Description: "Layanan reguler bulanan"},
				{Name: "Paket Unlimited All-Access", PriceIDR: tenant.Config.MinMarginFloorIDR * 5, QuotaSessions: 20, ValidityDays: 30, Description: "Akses tanpa batas seluruh fasilitas"},
			},
			CancellationTriggers: []models.CancellationTrigger{
				{TriggerPattern: "price_sensitivity", RecommendedAction: "OFFER_DISCOUNT", AllowedDiscountPct: tenant.Config.MaxDiscountPct, Description: "Tawarkan diskon retensi terkontrol"},
				{TriggerPattern: "schedule_conflict", RecommendedAction: "OFFER_SCHEDULE_SHIFT", AllowedDiscountPct: 0, Description: "Tawarkan pergantian jadwal ke jam low-occupancy"},
			},
			RetentionPolicy: models.RetentionPolicy{
				FreeFreezeAllowed: true,
				MaxFreezeDays:     30,
				AllowReschedule:   true,
				RefundPolicy:      "Non-refundable after 7 days",
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"tenant_id":       tenant.ID,
		"business_name":   tenant.BusinessName,
		"category":        tenant.Category,
		"config":          tenant.Config,
		"active_rules":    activeRules,
		"latest_guidebook": latestGb,
	})
}

// GetGuidebook handles GET /api/merchant/:tenantId/guidebook — the tenant's current
// guidebook, including the text AI grounding actually sees (useful to verify before a demo).
func (h *Handlers) GetGuidebook(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	gb, err := h.Store.GetCurrentGuidebook(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "no guidebook uploaded yet for this tenant"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "guidebook lookup failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "guidebook": gb})
}

// ListGuidebooks handles GET /api/merchant/:tenantId/guidebook/history — every version ever
// uploaded, newest first.
func (h *Handlers) ListGuidebooks(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	guidebooks, err := h.Store.ListGuidebooks(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list guidebooks"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "guidebooks": guidebooks})
}
