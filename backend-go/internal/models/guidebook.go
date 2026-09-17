package models

import "time"

type FinancialConstraints struct {
	MaxDiscountAllowedPct float64 `json:"max_discount_allowed_pct"`
	MinMarginFloorIDR     float64 `json:"min_margin_floor_idr"`
	Currency              string  `json:"currency"`
	Rationale             string  `json:"rationale"`
}

type BusinessProfile struct {
	BusinessName   string `json:"business_name"`
	Category       string `json:"category"`
	OperatingHours string `json:"operating_hours"`
	Summary        string `json:"summary"`
}

type ProductItem struct {
	Name          string  `json:"name"`
	PriceIDR      float64 `json:"price_idr"`
	QuotaSessions int     `json:"quota_sessions"`
	ValidityDays  int     `json:"validity_days"`
	Description   string  `json:"description"`
}

type CancellationTrigger struct {
	TriggerPattern     string  `json:"trigger_pattern"`
	RecommendedAction  string  `json:"recommended_action"`
	AllowedDiscountPct float64 `json:"allowed_discount_pct"`
	Description        string  `json:"description"`
}

type RetentionPolicy struct {
	FreeFreezeAllowed     bool   `json:"free_freeze_allowed"`
	MaxFreezeDays         int    `json:"max_freeze_days"`
	AllowReschedule       bool   `json:"allow_reschedule"`
	RescheduleNoticeHours int    `json:"reschedule_notice_hours"`
	RefundPolicy          string `json:"refund_policy"`
}

type ExtractedBusinessRules struct {
	BusinessProfile      BusinessProfile       `json:"business_profile"`
	FinancialConstraints FinancialConstraints  `json:"financial_constraints"`
	ProductCatalog       []ProductItem         `json:"product_catalog"`
	CancellationTriggers []CancellationTrigger `json:"cancellation_triggers"`
	RetentionPolicy      RetentionPolicy       `json:"retention_policy"`
}

type MerchantGuidebook struct {
	ID             string                  `json:"id"`
	TenantID       string                  `json:"merchant_id"`
	Filename       string                  `json:"filename"`
	FileType       string                  `json:"file_type"`
	RawText        string                  `json:"raw_text,omitempty"`
	ExtractedRules *ExtractedBusinessRules `json:"extracted_rules,omitempty"`
	Status         string                  `json:"status"` // PROCESSING, ACTIVE, FAILED
	ErrorMessage   string                  `json:"error_message,omitempty"`
	CreatedAt      time.Time               `json:"created_at"`
	UpdatedAt      time.Time               `json:"updated_at"`
}

type GuidebookIngestionWebhookRequest struct {
	MerchantID  string `json:"merchant_id"`
	DocumentURL string `json:"document_url,omitempty"`
	Filename    string `json:"filename,omitempty"`
	RawText     string `json:"raw_text,omitempty"`
	Notes       string `json:"notes,omitempty"`
}
