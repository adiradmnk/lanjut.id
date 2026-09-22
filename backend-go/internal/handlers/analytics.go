package handlers

// Merchant Analytics Query Agent: a Claude-Code-style side chat where the merchant owner
// asks a free-text question about their own business and gets back an AI-generated markdown
// report grounded in their real transaction history + member feedback (never invented
// numbers — see services.AIGateway.GenerateAnalyticsReport and
// ai/app/features/analytics/agent.py). Each session is a list of user/assistant turns,
// listable in the sidebar and reopenable with full history.

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/services"
	"lanjut/backend/internal/store"
)

const analyticsMaxTransactionsForAI = 60
const analyticsMaxFeedbackForAI = 40
const analyticsRedactedSignaturePlaceholder = "[REDACTED]"

// redactTransactionsForAnalytics strips bni_signature the same way the rest of the merchant
// dashboard does before handing transaction rows to anything outside the payment adapter
// that generated them — including this AI sidecar prompt.
func redactTransactionsForAnalytics(transactions []models.Transaction) []map[string]any {
	out := make([]map[string]any, 0, len(transactions))
	for _, t := range transactions {
		out = append(out, map[string]any{
			"trx_id":         t.TrxID,
			"merchant_id":    t.TenantID,
			"member_id":      t.MemberID,
			"session_id":     t.SessionID,
			"session_title":  t.SessionTitle,
			"amount":         t.Amount,
			"bni_va_number":  t.VANumber,
			"bni_signature":  analyticsRedactedSignaturePlaceholder,
			"status":         t.Status,
			"created_at":     t.CreatedAt,
			"paid_at":        t.PaidAt,
			"ai_offer_id":    t.AIOfferID,
		})
	}
	return out
}

// CreateAnalyticsSession handles POST /api/merchant/:tenantId/analytics-sessions — creates
// an empty session (no AI call yet); the merchant asks their first question via
// PostAnalyticsMessage right after.
func (h *Handlers) CreateAnalyticsSession(c *gin.Context) {
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

	session, err := h.Store.CreateAnalyticsSession(ctx, tenant.ID, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to create analytics session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "session": session})
}

// ListAnalyticsSessions handles GET /api/merchant/:tenantId/analytics-sessions — the
// sidebar's list of past analyses (and what the base "Analytics" tab summarizes).
func (h *Handlers) ListAnalyticsSessions(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	sessions, err := h.Store.ListAnalyticsSessions(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list analytics sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "sessions": sessions})
}

// GetAnalyticsSessionMessages handles
// GET /api/merchant/:tenantId/analytics-sessions/:sessionId/messages
func (h *Handlers) GetAnalyticsSessionMessages(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	sessionID := c.Param("sessionId")

	session, err := h.Store.GetAnalyticsSession(ctx, tenantID, sessionID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "analytics session not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "session lookup failed"})
		return
	}

	messages, err := h.Store.ListAnalyticsMessages(ctx, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list messages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "session": session, "messages": messages})
}

type postAnalyticsMessageRequest struct {
	Query string `json:"query" binding:"required"`
}

// PostAnalyticsMessage handles
// POST /api/merchant/:tenantId/analytics-sessions/:sessionId/messages — the merchant's
// question. Gathers this tenant's real transactions + feedback, sends them plus the
// session's prior turns to the AI sidecar, stores both the question and the AI's answer,
// and auto-titles the session from the AI's suggested title on its first turn.
func (h *Handlers) PostAnalyticsMessage(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")
	sessionID := c.Param("sessionId")

	var req postAnalyticsMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Query) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "query is required"})
		return
	}

	tenant, err := h.Store.GetTenant(ctx, tenantID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "tenant not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "tenant lookup failed"})
		return
	}

	session, err := h.Store.GetAnalyticsSession(ctx, tenantID, sessionID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "analytics session not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "session lookup failed"})
		return
	}

	priorMessages, err := h.Store.ListAnalyticsMessages(ctx, sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to load session history"})
		return
	}

	transactions, err := h.Store.ListTransactionsByTenant(ctx, tenantID, store.TransactionFilter{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to load transactions"})
		return
	}
	feedback, err := h.Store.ListFeedbackByTenant(ctx, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to load feedback"})
		return
	}

	// Store the user's question immediately so it shows up even if the AI call below fails.
	userMsg, err := h.Store.AddAnalyticsMessage(ctx, sessionID, "user", req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to save question"})
		return
	}

	// From here on the response is a Server-Sent Events stream: a "status" event per real
	// step this handler is actually doing (not a fake progress bar), then "chunk" events as
	// Gemini's answer streams in, then one final "done" event once it's persisted.
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	flusher, canFlush := c.Writer.(http.Flusher)

	writeSSE := func(event string, data gin.H) {
		payload, _ := json.Marshal(data)
		fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", event, payload)
		if canFlush {
			flusher.Flush()
		}
	}

	writeSSE("status", gin.H{"label": "Menyiapkan riwayat transaksi & feedback merchant..."})

	trxForAI := redactTransactionsForAnalytics(transactions)
	if len(trxForAI) > analyticsMaxTransactionsForAI {
		trxForAI = trxForAI[:analyticsMaxTransactionsForAI]
	}

	feedbackForAI := make([]map[string]any, 0, len(feedback))
	for _, f := range feedback {
		if len(feedbackForAI) >= analyticsMaxFeedbackForAI {
			break
		}
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

	history := make([]map[string]string, 0, len(priorMessages))
	for _, m := range priorMessages {
		history = append(history, map[string]string{"role": m.Role, "content": m.Content})
	}

	writeSSE("status", gin.H{"label": "Menghubungi Google Gemini untuk analisis..."})

	streamCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	resp, aiErr := h.AIGateway.StreamAnalyticsReport(streamCtx, services.AnalyticsReportInput{
		MerchantName: tenant.BusinessName,
		Category:     tenant.Category,
		Query:        req.Query,
		Transactions: trxForAI,
		Feedback:     feedbackForAI,
		History:      history,
	})

	var reportMarkdown, title, engineSource string
	if aiErr != nil {
		reportMarkdown = "Maaf, AI analytics engine sedang tidak tersedia. Silakan coba lagi sebentar lagi."
		title = req.Query
		engineSource = "LANJUT Deterministic Fallback Engine"
		writeSSE("chunk", gin.H{"text": reportMarkdown})
	} else {
		defer resp.Body.Close()
		var textBuf strings.Builder
		title = req.Query
		engineSource = "LANJUT Deterministic Fallback Engine"

		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		var currentEvent string
		for scanner.Scan() {
			line := scanner.Text()
			switch {
			case strings.HasPrefix(line, "event: "):
				currentEvent = strings.TrimPrefix(line, "event: ")
			case strings.HasPrefix(line, "data: "):
				raw := strings.TrimPrefix(line, "data: ")
				var payload map[string]any
				if err := json.Unmarshal([]byte(raw), &payload); err != nil {
					continue
				}
				switch currentEvent {
				case "chunk":
					if text, ok := payload["text"].(string); ok {
						textBuf.WriteString(text)
						writeSSE("chunk", gin.H{"text": text})
					}
				case "done":
					if t, ok := payload["title"].(string); ok && t != "" {
						title = t
					}
					if es, ok := payload["engine_source"].(string); ok && es != "" {
						engineSource = es
					}
				}
			}
		}
		reportMarkdown = textBuf.String()
		if reportMarkdown == "" {
			reportMarkdown = "Maaf, AI analytics engine sedang tidak tersedia. Silakan coba lagi sebentar lagi."
			writeSSE("chunk", gin.H{"text": reportMarkdown})
		}
	}
	if len(title) > 80 {
		title = title[:80]
	}

	assistantMsg, err := h.Store.AddAnalyticsMessage(ctx, sessionID, "assistant", reportMarkdown)
	if err != nil {
		writeSSE("error", gin.H{"message": "failed to save AI report"})
		return
	}

	// Auto-title the session from the AI's suggested title on its first turn, Claude-Code-style.
	if session.Title == "Analisis Baru" && title != "" {
		_ = h.Store.RenameAnalyticsSession(ctx, sessionID, title)
		session.Title = title
	}

	writeSSE("done", gin.H{
		"session_title":     session.Title,
		"user_message":      userMsg,
		"assistant_message": assistantMsg,
		"engine_source":     engineSource,
	})
}
