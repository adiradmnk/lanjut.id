package models

import "encoding/json"

type TenantConfig struct {
	MaxDiscountPct         float64 `json:"max_discount_allowed_pct"`
	MinMarginFloorIDR      float64 `json:"min_margin_floor_idr"`
	MinSlotFillRatioTarget float64 `json:"min_slot_fill_ratio_target"`
	AutoInterventionDays   int     `json:"auto_intervention_threshold_days"`
}

type Tenant struct {
	ID                    string       `json:"id"`
	BusinessName          string       `json:"business_name"`
	Category              string       `json:"category"`
	BNIAccountNumber      string       `json:"bni_account_number"`
	BNICompanyCode        string       `json:"bni_company_code"`
	BNIVAPrefix           string       `json:"bni_va_prefix"`
	LoanPlafondIDR        float64      `json:"loan_plafond_idr"`
	MonthlyInstallmentIDR float64      `json:"monthly_installment_idr"`
	LoanTenorMonths       int          `json:"loan_tenor_months"`
	Config                TenantConfig `json:"config"`
	// PaymentProvider selects which PaymentGatewayAdapter (services/paymentgateway.go)
	// CheckoutVA uses for this tenant: BNI | MIDTRANS | SIMULATOR. Defaults to BNI.
	PaymentProvider string  `json:"payment_provider"`
	BankPartnerID   *string `json:"bank_partner_id,omitempty"`
}

type Member struct {
	ID             string `json:"id"`
	TenantID       string `json:"merchant_id"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	CurrentPackage string `json:"current_package"`
	PackageTier    string `json:"package_tier"`
	ActiveUntil    string `json:"active_until"`
	TotalQuota     int    `json:"total_quota"`
	UsedQuota      int    `json:"used_quota"`
	JoinedAt       string `json:"joined_at"`
	ChurnRiskFlag  string `json:"churn_risk_flag"`
	// SubscriptionStatus: ACTIVE | CANCELLED. See migration 0011's ASUMSI note — a member
	// row itself is treated as the subscription, there's no separate subscriptions table.
	SubscriptionStatus string `json:"subscription_status"`
	ContactOptOut      bool   `json:"contact_opt_out"`
}

type ClassSession struct {
	ID                 string  `json:"id"`
	TenantID           string  `json:"merchant_id"`
	Title              string  `json:"title"`
	DayOfWeek          string  `json:"day_of_week"`
	TimeSlot           string  `json:"time_slot"`
	TimeOfDay          string  `json:"time_of_day"`
	Instructor         string  `json:"instructor"`
	TotalCapacity      int     `json:"total_capacity"`
	BookedSlots        int     `json:"booked_slots"`
	PricePerSessionIDR float64 `json:"price_per_session_idr"`
}

type Transaction struct {
	TrxID        string  `json:"trx_id"`
	TenantID     string  `json:"merchant_id"`
	MemberID     string  `json:"member_id"`
	SessionID    string  `json:"session_id"`
	SessionTitle string  `json:"session_title"`
	Amount       float64 `json:"amount"`
	VANumber     string  `json:"bni_va_number"`
	Signature    string  `json:"bni_signature"`
	Status       string  `json:"status"`
	CreatedAt    string  `json:"created_at"`
	PaidAt       *string `json:"paid_at,omitempty"`
	AIOfferID    *string `json:"ai_offer_id,omitempty"`
	// ProviderMetadata is provider-specific extra data (e.g. Midtrans's order_id/token)
	// that doesn't fit the common columns. Never used for anything security-sensitive —
	// signatures/API keys are redacted before anything is ever written here.
	ProviderMetadata json.RawMessage `json:"provider_metadata,omitempty"`
}

// ProductPackage is a merchant's official catalog entry (the "guidebook"). Generic across
// merchant verticals — quota_sessions/duration_days are interpreted per-vertical by the
// merchant (e.g. class sessions for a gym, delivery slots for catering, nights for a kos).
type ProductPackage struct {
	ID            string  `json:"id"`
	TenantID      string  `json:"tenant_id"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	PriceIDR      float64 `json:"price_idr"`
	QuotaSessions int     `json:"quota_sessions"`
	DurationDays  int     `json:"duration_days"`
	BillingType   string  `json:"billing_type"`
	IsActive      bool    `json:"is_active"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     string  `json:"updated_at"`
}

// AIOffer is a candidate offer (from the catalog, or AI-generated beyond it) gated behind
// mandatory merchant approval. AI can never move a row past AI_SUGGESTED on its own.
type AIOffer struct {
	ID                 string          `json:"id"`
	TenantID           string          `json:"tenant_id"`
	MemberID           string          `json:"member_id"`
	Source             string          `json:"source"` // CATALOG | AI_GENERATED
	BasedOnPackageID   *string         `json:"based_on_package_id,omitempty"`
	TargetSessionID    *string         `json:"target_session_id,omitempty"`
	ProposedTitle      string          `json:"proposed_title"`
	TermsSnapshot      json.RawMessage `json:"terms_snapshot,omitempty"`
	PriceIDR           float64         `json:"price_idr"`
	DiscountPct        float64         `json:"discount_pct"`
	ProjectedMarginIDR float64         `json:"projected_margin_idr"`
	Status             string          `json:"status"`
	RejectionReason    string          `json:"rejection_reason,omitempty"`
	ApprovedBy         string          `json:"approved_by,omitempty"`
	ApprovedAt         *string         `json:"approved_at,omitempty"`
	ExpiresAt          *string         `json:"expires_at,omitempty"`
	CreatedAt          string          `json:"created_at"`
}

// OfferCandidate is an unpersisted offer draft produced by the AI sidecar (or the local
// deterministic fallback). The caller must run it through ValidateOfferConstraint before
// it is ever persisted as an ai_offers row.
type OfferCandidate struct {
	Source             string  `json:"source"`
	BasedOnPackageID   *string `json:"based_on_package_id,omitempty"`
	TargetSessionID    *string `json:"target_session_id,omitempty"`
	ProposedTitle      string  `json:"proposed_title"`
	PriceIDR           float64 `json:"price_idr"`
	DiscountPct        float64 `json:"discount_pct"`
	ProjectedMarginIDR float64 `json:"projected_margin_idr"`
}

// Invoice is the customer-facing receipt issued once a transaction settles. One per
// transaction (trx_id is unique) — it's a record of what was actually charged, not
// something the offers/approval flow can retroactively change.
type Invoice struct {
	ID            string  `json:"id"`
	InvoiceNumber string  `json:"invoice_number"`
	TrxID         string  `json:"trx_id"`
	TenantID      string  `json:"tenant_id"`
	MemberID      string  `json:"member_id"`
	AIOfferID     *string `json:"ai_offer_id,omitempty"`
	ItemTitle     string  `json:"item_title"`
	AmountIDR     float64 `json:"amount_idr"`
	CustomerName  string  `json:"customer_name"`
	CustomerEmail string  `json:"customer_email,omitempty"`
	MerchantName  string  `json:"merchant_name"`
	VANumber      string  `json:"bni_va_number,omitempty"`
	IssuedAt      string  `json:"issued_at"`
	PaidAt        *string `json:"paid_at,omitempty"`
}

// Guidebook is a merchant's uploaded document (full catalog/package/policy/payment detail).
// File bytes live in R2 (r2_key/r2_url reference the object there); extracted_text is what
// the AI sidecar pulled out of it, and is what generate-offers grounds its prompt on.
type Guidebook struct {
	ID               string `json:"id"`
	TenantID         string `json:"tenant_id"`
	Filename         string `json:"filename"`
	R2Key            string `json:"r2_key"`
	R2URL            string `json:"r2_url,omitempty"`
	ContentType      string `json:"content_type"`
	SizeBytes        int64  `json:"size_bytes"`
	ExtractedText    string `json:"extracted_text,omitempty"`
	ExtractionStatus string `json:"extraction_status"`
	IsCurrent        bool   `json:"is_current"`
	UploadedAt       string `json:"uploaded_at"`
}

// Feedback is a customer's free-text complaint/grievance, translated into structured intent
// by the AI sidecar's /translate-grievance endpoint. The raw text is always saved even if
// translation fails — a complaint is never lost just because the AI sidecar hiccuped.
type Feedback struct {
	ID                 string          `json:"id"`
	TenantID           string          `json:"tenant_id"`
	MemberID           string          `json:"member_id"`
	RawText            string          `json:"raw_text"`
	Intent             string          `json:"intent,omitempty"`
	Category           string          `json:"category,omitempty"`
	PreferredTimeOfDay string          `json:"preferred_time_of_day,omitempty"`
	PreferredDays      json.RawMessage `json:"preferred_days,omitempty"`
	ChurnRiskScore     float64         `json:"churn_risk_score,omitempty"`
	Sentiment          string          `json:"sentiment,omitempty"`
	RootCauseSummary   string          `json:"root_cause_summary,omitempty"`
	RecommendedAction  string          `json:"recommended_action,omitempty"`
	AIEngineSource     string          `json:"ai_engine_source,omitempty"`
	Status             string          `json:"status"`
	CreatedAt          string          `json:"created_at"`
}

// Account is a staff login (merchant dashboard staff, or a BNI "partner"/relationship
// manager). PasswordHash is deliberately excluded from JSON — it must never leave the
// server, not even by accident via a debug endpoint that dumps a struct.
type Account struct {
	ID           string  `json:"id"`
	Email        string  `json:"email"`
	PasswordHash string  `json:"-"`
	Role         string  `json:"role"` // merchant | partner
	TenantID     *string `json:"tenant_id,omitempty"`
	Name         string  `json:"name"`
	CreatedAt    string  `json:"created_at"`
}

// PaymentGatewayLog is a raw request/response/webhook audit trail entry (FASE 1b). Never
// exposes a real signature/API key — those are redacted by the adapter at the point the log
// payload is built (see bnipayment.go/midtrans.go), not here.
type PaymentGatewayLog struct {
	ID            string          `json:"id"`
	TransactionID *string         `json:"transaction_id,omitempty"`
	Provider      string          `json:"provider"`
	Direction     string          `json:"direction"` // REQUEST | RESPONSE | WEBHOOK
	RawPayload    json.RawMessage `json:"raw_payload"`
	CreatedAt     string          `json:"created_at"`
}

// AITransactionFeedItem is the PII-stripped view of a transaction exposed to the AI sidecar
// (GET /api/ai/tenants/:tenantId/transaction-feed). Deliberately excludes name/email/phone/
// virtualAccountNo/signature/raw_payload — see store.ListTenantTransactionFeedForAI.
type AITransactionFeedItem struct {
	MemberRef       string  `json:"member_ref"`
	SessionCategory string  `json:"session_category"`
	Amount          float64 `json:"amount"`
	Status          string  `json:"status"`
	BillingType     string  `json:"billing_type"`
	PaidAt          *string `json:"paid_at"`
	CreatedAt       string  `json:"created_at"`
}

// MemberFeedback is free-text feedback tied to a specific context (a cancellation, a failed
// payment, a periodic pulse check). See migration 0011 for why context_ref_id is never NULL.
type MemberFeedback struct {
	ID           string `json:"id"`
	MemberID     string `json:"member_id"`
	TenantID     string `json:"tenant_id"`
	ContextType  string `json:"context_type"` // CANCELLATION | PAYMENT_FAILURE | PULSE_CHECK
	ContextRefID string `json:"context_ref_id,omitempty"`
	ReasonCode   string `json:"reason_code,omitempty"`
	FreeText     string `json:"free_text,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// SupportTicket is a customer's escalation to a human. At most one OPEN ticket exists per
// (member, tenant) at a time — enforced by a partial unique index, not application code.
type SupportTicket struct {
	ID         string  `json:"id"`
	MemberID   string  `json:"member_id"`
	TenantID   string  `json:"tenant_id"`
	Issue      string  `json:"issue"`
	Status     string  `json:"status"` // OPEN | RESOLVED
	CreatedAt  string  `json:"created_at"`
	ResolvedAt *string `json:"resolved_at,omitempty"`
}

// Reservation is a soft hold on a session slot while an offer awaits/holds approval, so two
// concurrent generate-offers calls can't both grab the last seat.
type Reservation struct {
	ID        string  `json:"id"`
	AIOfferID *string `json:"ai_offer_id,omitempty"`
	SessionID string  `json:"session_id"`
	MemberID  string  `json:"member_id"`
	Status    string  `json:"status"`
	HeldUntil *string `json:"held_until,omitempty"`
	CreatedAt string  `json:"created_at"`
}

type SmartOption struct {
	ID                 string  `json:"id"`
	Type               string  `json:"type"`
	Title              string  `json:"title"`
	Badge              string  `json:"badge"`
	Highlight          string  `json:"highlight"`
	Description        string  `json:"description"`
	TargetSessionID    string  `json:"target_session_id,omitempty"`
	TargetSessionTitle string  `json:"target_session_title,omitempty"`
	TargetSessionTime  string  `json:"target_session_time,omitempty"`
	PriceAdjustmentIDR float64 `json:"price_adjustment_idr"`
	OriginalPriceIDR   float64 `json:"original_price_idr,omitempty"`
	DiscountLabel      string  `json:"discount_label,omitempty"`
	AvailableSlots     int     `json:"available_slots"`
	ActionLabel        string  `json:"action_label"`
}
