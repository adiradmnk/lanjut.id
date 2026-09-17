package handlers

// Merchant catalog ("guidebook") — the official menu of packages a merchant sells.
// Generic across verticals: quota_sessions/duration_days/billing_type are interpreted
// per-merchant (gym class credits, catering delivery slots, kos nights, cafe vouchers, ...).

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/store"
)

type createPackageRequest struct {
	Name          string  `json:"name" binding:"required"`
	Description   string  `json:"description"`
	PriceIDR      float64 `json:"price_idr" binding:"required"`
	QuotaSessions int     `json:"quota_sessions"`
	DurationDays  int     `json:"duration_days"`
	BillingType   string  `json:"billing_type" binding:"required,oneof=SUBSCRIPTION ONE_TIME"`
	IsActive      *bool   `json:"is_active"`
}

// CreatePackage handles POST /api/merchant/:tenantId/packages
func (h *Handlers) CreatePackage(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	var body createPackageRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": err.Error()})
		return
	}

	if _, err := h.Store.GetTenant(ctx, tenantID); errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "tenant not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}

	isActive := true
	if body.IsActive != nil {
		isActive = *body.IsActive
	}

	pkg, err := h.Store.CreateProductPackage(ctx, models.ProductPackage{
		TenantID:      tenantID,
		Name:          body.Name,
		Description:   body.Description,
		PriceIDR:      body.PriceIDR,
		QuotaSessions: body.QuotaSessions,
		DurationDays:  body.DurationDays,
		BillingType:   body.BillingType,
		IsActive:      isActive,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to create package"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "success", "package": pkg})
}

// ListPackages handles GET /api/merchant/:tenantId/packages
func (h *Handlers) ListPackages(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	packages, err := h.Store.ListProductPackages(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list packages"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "packages": packages})
}

type updatePackageRequest struct {
	Name          *string  `json:"name"`
	Description   *string  `json:"description"`
	PriceIDR      *float64 `json:"price_idr"`
	QuotaSessions *int     `json:"quota_sessions"`
	DurationDays  *int     `json:"duration_days"`
	BillingType   *string  `json:"billing_type" binding:"omitempty,oneof=SUBSCRIPTION ONE_TIME"`
	IsActive      *bool    `json:"is_active"`
}

// UpdatePackage handles PATCH /api/merchant/:tenantId/packages/:id
func (h *Handlers) UpdatePackage(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	id := c.Param("id")

	existing, err := h.Store.GetProductPackage(ctx, id)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "package not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "package lookup failed"})
		return
	}
	if existing.TenantID != tenantID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "package does not belong to this tenant"})
		return
	}

	var body updatePackageRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": err.Error()})
		return
	}

	if body.Name != nil {
		existing.Name = *body.Name
	}
	if body.Description != nil {
		existing.Description = *body.Description
	}
	if body.PriceIDR != nil {
		existing.PriceIDR = *body.PriceIDR
	}
	if body.QuotaSessions != nil {
		existing.QuotaSessions = *body.QuotaSessions
	}
	if body.DurationDays != nil {
		existing.DurationDays = *body.DurationDays
	}
	if body.BillingType != nil {
		existing.BillingType = *body.BillingType
	}
	if body.IsActive != nil {
		existing.IsActive = *body.IsActive
	}

	updated, err := h.Store.UpdateProductPackage(ctx, *existing)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to update package"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "package": updated})
}
