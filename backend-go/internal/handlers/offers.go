package handlers

// AI offer generation and the mandatory merchant approval gate. AI can propose a candidate
// (GenerateOffers) but can never transition it past AI_SUGGESTED through any other path —
// only ApproveOffer/RejectOffer (merchant) or DeclineOffer (customer, post-approval) can.

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

// GenerateOffers handles POST /api/ai/tenants/:tenantId/members/:memberId/generate-offers
func (h *Handlers) GenerateOffers(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	memberID := c.Param("memberId")

	member, err := h.Store.GetMember(ctx, memberID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "member not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "member lookup failed"})
		return
	}
	if member.TenantID != tenantID {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "message": "member does not belong to this tenant"})
		return
	}

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}

	packages, err := h.Store.ListActiveProductPackages(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "package lookup failed"})
		return
	}
	sessions, err := h.Store.ListAvailableSessions(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "session lookup failed"})
		return
	}

	// Ground the AI's proposal on the merchant's uploaded guidebook (full catalog/policy/
	// payment detail), if one has been uploaded. No guidebook is not an error — the sidecar
	// (and the local fallback) still work without it, just less specifically grounded.
	var guidebookContext string
	if gb, err := h.Store.GetCurrentGuidebook(ctx, tenantID); err == nil {
		guidebookContext = gb.ExtractedText
	} else if !errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "guidebook lookup failed"})
		return
	}

	// AI sidecar first, with a generous timeout since this is a manually-triggered
	// operation and may involve a real Gemini call grounded on the guidebook text above; if
	// it's offline/slow/erroring, GenerateOffers itself falls back to the local deterministic
	// generator (services.GenerateOfferCandidates).
	candidates := h.AIGateway.GenerateOffers(ctx, member, tenant, packages, sessions, guidebookContext)

	created := make([]models.AIOffer, 0, len(candidates))
	rejected := make([]gin.H, 0)

	for _, cand := range candidates {
		// Server-side constraint gate: a candidate that violates the tenant's discount/margin
		// guardrails never reaches the AI_SUGGESTED queue at all, let alone a merchant's screen.
		if err := services.ValidateOfferConstraint(tenant, cand.DiscountPct, cand.PriceIDR); err != nil {
			slog.Warn("ai offer candidate rejected by constraint validation",
				"tenant_id", tenantID, "member_id", memberID, "title", cand.ProposedTitle, "reason", err.Error())
			rejected = append(rejected, gin.H{"proposed_title": cand.ProposedTitle, "reason": err.Error()})
			continue
		}

		offer := models.AIOffer{
			TenantID:           tenantID,
			MemberID:           memberID,
			Source:             cand.Source,
			BasedOnPackageID:   cand.BasedOnPackageID,
			TargetSessionID:    cand.TargetSessionID,
			ProposedTitle:      cand.ProposedTitle,
			PriceIDR:           cand.PriceIDR,
			DiscountPct:        cand.DiscountPct,
			ProjectedMarginIDR: cand.ProjectedMarginIDR,
		}

		createdOffer, _, err := h.Store.CreateOfferWithReservation(ctx, offer, time.Now().Add(offerExpiryWindow), reservationHoldWindow)
		if errors.Is(err, store.ErrSlotFull) {
			rejected = append(rejected, gin.H{
				"proposed_title": cand.ProposedTitle,
				"reason":         "SLOT_FULL: sesi target sudah penuh atau sedang ditahan penawaran lain",
			})
			continue
		}
		if errors.Is(err, store.ErrNotFound) {
			rejected = append(rejected, gin.H{"proposed_title": cand.ProposedTitle, "reason": "target session not found"})
			continue
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to create offer"})
			return
		}
		created = append(created, *createdOffer)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":          "success",
		"offers_created":  created,
		"offers_rejected": rejected,
	})
}

// ListPendingOffers handles GET /api/merchant/:tenantId/pending-offers
func (h *Handlers) ListPendingOffers(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	offers, err := h.Store.ListPendingOffers(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list pending offers"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "offers": offers})
}

type approveOfferRequest struct {
	ApprovedBy string `json:"approved_by"`
}

// ApproveOffer handles POST /api/merchant/:tenantId/offers/:offerId/approve
func (h *Handlers) ApproveOffer(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	offerID := c.Param("offerId")

	var body approveOfferRequest
	_ = c.ShouldBindJSON(&body)
	approvedBy := body.ApprovedBy
	if approvedBy == "" {
		approvedBy = "merchant-staff"
	}

	// The terms_snapshot itself is built inside store.ApproveOffer, from data read as of the
	// moment the offer row is locked — not from a read taken here beforehand — so it's
	// atomic with the approval rather than a moment-earlier snapshot.
	updated, alreadyProcessed, err := h.Store.ApproveOffer(ctx, tenantID, offerID, approvedBy)
	if errors.Is(err, store.ErrOfferExpired) {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"code":    "OFFER_EXPIRED",
			"message": "Penawaran ini sudah kedaluwarsa dan tidak bisa disetujui lagi.",
		})
		return
	}
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "offer not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to approve offer"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Penawaran ini sudah diproses sebelumnya.",
			"offer":   updated,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "offer": updated})
}

type rejectOfferRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// RejectOffer handles POST /api/merchant/:tenantId/offers/:offerId/reject
func (h *Handlers) RejectOffer(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	offerID := c.Param("offerId")

	var body rejectOfferRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "reason is required"})
		return
	}

	updated, alreadyProcessed, err := h.Store.RejectOffer(ctx, tenantID, offerID, body.Reason)
	if errors.Is(err, store.ErrOfferExpired) {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"code":    "OFFER_EXPIRED",
			"message": "Penawaran ini sudah kedaluwarsa.",
		})
		return
	}
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "offer not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to reject offer"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Penawaran ini sudah diproses sebelumnya.",
			"offer":   updated,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "offer": updated})
}

type declineOfferRequest struct {
	MemberID string `json:"member_id" binding:"required"`
	Reason   string `json:"reason"`
}

// DeclineOffer handles POST /api/member/offers/:offerId/decline.
// The customer changed their mind about an already-merchant-approved offer, before paying.
// Scoped to member_id so one member can't decline another member's offer.
func (h *Handlers) DeclineOffer(c *gin.Context) {
	ctx := c.Request.Context()
	offerID := c.Param("offerId")

	var body declineOfferRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "member_id is required"})
		return
	}

	reason := body.Reason
	if reason == "" {
		reason = "Dibatalkan oleh pelanggan"
	}

	updated, alreadyProcessed, err := h.Store.DeclineOfferByCustomer(ctx, body.MemberID, offerID, reason)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "offer not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to decline offer"})
		return
	}

	if alreadyProcessed {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ALREADY_PROCESSED",
			"message": "Penawaran ini sudah diproses sebelumnya.",
			"offer":   updated,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "offer": updated})
}
