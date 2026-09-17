package handlers

// Customer-facing invoices/receipts. An invoice is generated the moment a transaction
// settles (see payments.go BNIWebhook) and is otherwise immutable — it's a record of what
// was actually charged, not something the offers/approval flow can retroactively change.

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"lanjut/backend/internal/models"
	"lanjut/backend/internal/store"
)

// errInvoiceNotPaidYet means the transaction exists but hasn't settled, so there's nothing
// to invoice yet.
var errInvoiceNotPaidYet = errors.New("transaction not paid yet")

// ensureInvoiceForTransaction returns the invoice for a settled transaction, generating it
// on first use if it doesn't exist yet (idempotent — see store.CreateInvoice). Called right
// after a successful webhook settle, and lazily as a fallback from GetInvoice below in case
// that first call ever failed — the customer should always be able to pull up their receipt
// once the transaction is actually PAID, regardless of ordering.
func (h *Handlers) ensureInvoiceForTransaction(ctx context.Context, trxID string) (*models.Invoice, error) {
	if inv, err := h.Store.GetInvoiceByTrxID(ctx, trxID); err == nil {
		return inv, nil
	} else if !errors.Is(err, store.ErrNotFound) {
		return nil, err
	}

	trx, err := h.Store.GetTransaction(ctx, trxID)
	if err != nil {
		return nil, err
	}
	if trx.Status != "PAID" {
		return nil, errInvoiceNotPaidYet
	}

	member, err := h.Store.GetMember(ctx, trx.MemberID)
	if err != nil {
		return nil, err
	}
	tenant, err := h.Store.GetTenant(ctx, trx.TenantID)
	if err != nil {
		return nil, err
	}

	return h.Store.CreateInvoice(ctx, store.NewInvoiceInput{
		InvoiceNumber: newInvoiceNumber(),
		TrxID:         trx.TrxID,
		TenantID:      trx.TenantID,
		MemberID:      trx.MemberID,
		AIOfferID:     trx.AIOfferID,
		ItemTitle:     trx.SessionTitle,
		AmountIDR:     trx.Amount,
		CustomerName:  member.Name,
		CustomerEmail: member.Email,
		MerchantName:  tenant.BusinessName,
		VANumber:      trx.VANumber,
		PaidAt:        time.Now(),
	})
}

func newInvoiceNumber() string {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	return fmt.Sprintf("INV-%s-%s", time.Now().Format("20060102"), strings.ToUpper(hex.EncodeToString(buf)))
}

// GetInvoice handles GET /api/member/invoices/:trxId — the customer's receipt for a settled
// transaction.
func (h *Handlers) GetInvoice(c *gin.Context) {
	ctx := c.Request.Context()
	trxID := c.Param("trxId")

	inv, err := h.ensureInvoiceForTransaction(ctx, trxID)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"status": "error", "message": "transaction not found"})
		return
	}
	if errors.Is(err, errInvoiceNotPaidYet) {
		c.JSON(http.StatusConflict, gin.H{
			"status":  "error",
			"code":    "NOT_PAID_YET",
			"message": "Invoice belum bisa diterbitkan karena transaksi belum lunas.",
		})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to generate invoice"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "invoice": inv})
}

// ListMemberInvoices handles GET /api/member/invoices?member_id=... — a customer's full
// receipt history.
func (h *Handlers) ListMemberInvoices(c *gin.Context) {
	ctx := c.Request.Context()
	memberID := c.Query("member_id")
	if memberID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "member_id is required"})
		return
	}

	invoices, err := h.Store.ListInvoicesByMember(ctx, memberID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to list invoices"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "invoices": invoices})
}
