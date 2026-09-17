package handlers

// FASE 1b — transaction history exposure, two audiences with very different privacy rules:
//   - ListMerchantTransactions: internal/backend dashboard & reconciliation. Full records,
//     but bni_signature is ALWAYS redacted regardless of context — the raw value only ever
//     needs to exist transiently inside the payment adapter that generated it.
//   - ListTenantTransactionFeedForAI: PII-stripped feed for the AI sidecar. No name/email/
//     phone/virtualAccountNo/signature/raw_payload — see models.AITransactionFeedItem.

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/store"
)

const redactedSignaturePlaceholder = "[REDACTED]"

// ListMerchantTransactions handles
// GET /api/merchant/:tenantId/transactions?member_id=&status=&from=&to=
func (h *Handlers) ListMerchantTransactions(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	filter := store.TransactionFilter{
		MemberID: c.Query("member_id"),
		Status:   c.Query("status"),
	}
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse(time.RFC3339, from); err == nil {
			filter.From = &t
		} else if t, err := time.Parse("2006-01-02", from); err == nil {
			filter.From = &t
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid 'from' date (use YYYY-MM-DD or RFC3339)"})
			return
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse(time.RFC3339, to); err == nil {
			filter.To = &t
		} else if t, err := time.Parse("2006-01-02", to); err == nil {
			filter.To = &t
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid 'to' date (use YYYY-MM-DD or RFC3339)"})
			return
		}
	}

	transactions, err := h.Store.ListTransactionsByTenant(ctx, tenantID, filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list transactions"})
		return
	}

	// bni_signature redacted here, at the point of exposing this response — never as-is,
	// regardless of who's asking or what filters they used.
	out := make([]gin.H, 0, len(transactions))
	for _, t := range transactions {
		out = append(out, gin.H{
			"trx_id":            t.TrxID,
			"merchant_id":       t.TenantID,
			"member_id":         t.MemberID,
			"session_id":        t.SessionID,
			"session_title":     t.SessionTitle,
			"amount":            t.Amount,
			"bni_va_number":     t.VANumber,
			"bni_signature":     redactedSignaturePlaceholder,
			"status":            t.Status,
			"created_at":        t.CreatedAt,
			"paid_at":           t.PaidAt,
			"ai_offer_id":       t.AIOfferID,
			"provider_metadata": t.ProviderMetadata,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"status":       "success",
		"tenant_id":    tenantID,
		"transactions": out,
		"total":        len(out),
	})
}

// ListTenantTransactionFeedForAI handles
// GET /api/ai/tenants/:tenantId/transaction-feed?since=
func (h *Handlers) ListTenantTransactionFeedForAI(c *gin.Context) {
	ctx := c.Request.Context()
	tenantID := c.Param("tenantId")

	var since *time.Time
	if raw := c.Query("since"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			since = &t
		} else if t, err := time.Parse("2006-01-02", raw); err == nil {
			since = &t
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "invalid 'since' date (use YYYY-MM-DD or RFC3339)"})
			return
		}
	}

	feed, err := h.Store.ListTenantTransactionFeedForAI(ctx, tenantID, since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to build transaction feed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":       "success",
		"tenant_id":    tenantID,
		"transactions": feed,
		"total":        len(feed),
	})
}
