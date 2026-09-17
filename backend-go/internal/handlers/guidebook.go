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
// field name "file"). Uploads the raw file to R2, asks the AI sidecar to extract its text,
// and records both. Text extraction failing does not fail the upload — the document is
// still saved and can be re-extracted later; it just won't ground AI offers until then.
func (h *Handlers) UploadGuidebook(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "error",
			"code":    "R2_NOT_CONFIGURED",
			"message": "Cloudflare R2 belum dikonfigurasi di server ini (isi R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY).",
		})
		return
	}

	if _, err := h.Store.GetTenant(ctx, tenantID); errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "tenant not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}

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
	r2URL, err := h.Storage.Upload(ctx, r2Key, bytes.NewReader(data), int64(len(data)), contentType)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"status": "error", "message": "failed to upload to R2: " + err.Error()})
		return
	}

	extractedText, err := h.AIGateway.ExtractDocumentText(ctx, fileHeader.Filename, contentType, data)
	extractionStatus := "SUCCESS"
	if err != nil {
		slog.Warn("guidebook text extraction failed; file is saved but won't ground AI yet",
			"tenant_id", tenantID, "filename", fileHeader.Filename, "err", err.Error())
		extractionStatus = "FAILED"
	}

	gb, err := h.Store.CreateGuidebook(ctx, store.NewGuidebookInput{
		TenantID:         tenantID,
		Filename:         fileHeader.Filename,
		R2Key:            r2Key,
		R2URL:            r2URL,
		ContentType:      contentType,
		SizeBytes:        fileHeader.Size,
		ExtractedText:    extractedText,
		ExtractionStatus: extractionStatus,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to record guidebook"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "success", "guidebook": gb})
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
