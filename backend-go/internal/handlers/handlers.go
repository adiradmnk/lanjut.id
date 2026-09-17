package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

// offerExpiryWindow is how long a generated ai_offer sits in the AI_SUGGESTED queue before
// it's lazily treated as EXPIRED if no merchant staff has approved/rejected it.
const offerExpiryWindow = 24 * time.Hour

// reservationHoldWindow is how long a HELD reservation blocks a session slot while its
// offer awaits merchant approval, before it's lazily released back to the pool.
const reservationHoldWindow = 15 * time.Minute

type Handlers struct {
	Store      *store.Store
	MagicToken *services.MagicTokenService
	AIGateway  *services.AIGateway
	BNI        *services.BNIPaymentService
	// Storage is nil when R2 credentials aren't configured — guidebook upload is an
	// optional feature, not a hard startup dependency. Handlers that need it check for nil.
	Storage *services.R2Storage
	// Mailjet is nil when Mailjet credentials aren't configured — same nil-safe pattern as
	// Storage. Without it, OTP login can't send the code and reports a clear 503.
	Mailjet *services.MailjetService
}

func New(s *store.Store, mt *services.MagicTokenService, ai *services.AIGateway, bni *services.BNIPaymentService, storage *services.R2Storage, mailjet *services.MailjetService) *Handlers {
	return &Handlers{Store: s, MagicToken: mt, AIGateway: ai, BNI: bni, Storage: storage, Mailjet: mailjet}
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
