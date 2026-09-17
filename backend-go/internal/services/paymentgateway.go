package services

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// PaymentStatus is the internal, provider-agnostic settlement state a NormalizedPaymentEvent
// resolves to, regardless of which provider's own vocabulary produced it (BNI's "PAID",
// Midtrans's "settlement"/"capture", etc. all normalize to one of these).
type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "PENDING"
	PaymentStatusPaid    PaymentStatus = "PAID"
	PaymentStatusFailed  PaymentStatus = "FAILED"
	PaymentStatusExpired PaymentStatus = "EXPIRED"
)

// CreatePaymentRequest is the provider-agnostic input to CreatePaymentInstruction. Mirrors
// CreateVARequest (bnipayment.go) field-for-field so the BNI adapter's refactor is a rename,
// not a behavior change.
type CreatePaymentRequest struct {
	MemberID      string
	TenantID      string
	SessionID     string
	SessionTitle  string
	AmountIDR     float64
	CustomerName  string
	CustomerEmail string
	CustomerPhone string
}

// PaymentInstructionResult is the provider-agnostic output of CreatePaymentInstruction —
// "here's how the customer pays" (a VA number for BNI, a redirect/token for Midtrans, etc).
// ProviderRef is the provider-specific payment reference (BNI's va_number, Midtrans's
// order_id/token); TrxID is LANJUT's own internal transaction id either way.
type PaymentInstructionResult struct {
	Status string // SUCCESS | GATEWAY_ERROR — kept as a string (not PaymentStatus) for
	// backward compatibility with the existing CreateVAResult.Status shape handlers.go reads.
	TrxID       string
	ProviderRef string
	AmountIDR   float64
	ExpiredAt   time.Time
	Signature   string
	Error       string
	RawMetadata json.RawMessage // provider-specific extra fields, stored to transactions.provider_metadata

	// RequestLog/ResponseLog are what the adapter itself builds for payment_gateway_logs
	// (FASE 1b) — the adapter is the only place that ever sees the real signature/API key,
	// so it redacts them here, at the point of writing, before the caller (the handler)
	// ever touches these fields. May be nil if the adapter doesn't populate them.
	RequestLog  json.RawMessage
	ResponseLog json.RawMessage
}

// NormalizedPaymentEvent is what ParseWebhook produces: a provider webhook payload reduced
// to exactly what SettleTransaction needs, regardless of which provider sent it.
type NormalizedPaymentEvent struct {
	ProviderRef   string
	InternalTrxID string
	Status        PaymentStatus
	AmountIDR     float64
	RawPayload    []byte
}

// PaymentGatewayAdapter is the one interface every payment provider (BNI, Midtrans, and
// whatever comes after) implements, so handlers.go / payments.go never hardcode a specific
// provider — they pick an adapter based on tenant.PaymentProvider and call this interface.
type PaymentGatewayAdapter interface {
	// CreatePaymentInstruction issues a new payment instruction (VA, redirect token, etc.)
	// for a customer to pay. Never returns a Go error for provider-side failures — those
	// come back as Status: "GATEWAY_ERROR" with Error populated, same convention the
	// existing BNI sandbox simulator already uses, so callers have one failure path to
	// handle instead of two.
	CreatePaymentInstruction(ctx context.Context, req CreatePaymentRequest) (PaymentInstructionResult, error)

	// ParseWebhook verifies and normalizes an inbound webhook payload. Returns an error if
	// the signature is invalid or the payload can't be parsed at all — the caller (the
	// webhook handler) must NOT call SettleTransaction on a ParseWebhook error.
	ParseWebhook(ctx context.Context, rawBody []byte, headers http.Header) (NormalizedPaymentEvent, error)

	// QueryStatus asks the provider directly for a payment reference's current status —
	// for reconciliation, independent of whatever webhooks did or didn't arrive.
	QueryStatus(ctx context.Context, providerRef string) (PaymentStatus, error)
}
