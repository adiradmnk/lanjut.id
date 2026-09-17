package models

type TenantConfig struct {
	MaxDiscountPct           float64 `json:"max_discount_allowed_pct"`
	MinMarginFloorIDR        float64 `json:"min_margin_floor_idr"`
	MinSlotFillRatioTarget   float64 `json:"min_slot_fill_ratio_target"`
	AutoInterventionDays     int     `json:"auto_intervention_threshold_days"`
}

type Tenant struct {
	ID                    string  `json:"id"`
	BusinessName          string  `json:"business_name"`
	Category              string  `json:"category"`
	BNIAccountNumber      string  `json:"bni_account_number"`
	BNICompanyCode        string  `json:"bni_company_code"`
	BNIVAPrefix           string  `json:"bni_va_prefix"`
	LoanPlafondIDR        float64 `json:"loan_plafond_idr"`
	MonthlyInstallmentIDR float64 `json:"monthly_installment_idr"`
	LoanTenorMonths       int     `json:"loan_tenor_months"`
	Config                TenantConfig `json:"config"`
}

type Member struct {
	ID             string  `json:"id"`
	TenantID       string  `json:"merchant_id"`
	Name           string  `json:"name"`
	Email          string  `json:"email"`
	Phone          string  `json:"phone"`
	CurrentPackage string  `json:"current_package"`
	PackageTier    string  `json:"package_tier"`
	ActiveUntil    string  `json:"active_until"`
	TotalQuota     int     `json:"total_quota"`
	UsedQuota      int     `json:"used_quota"`
	JoinedAt       string  `json:"joined_at"`
	ChurnRiskFlag  string  `json:"churn_risk_flag"`
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
	TrxID         string  `json:"trx_id"`
	TenantID      string  `json:"merchant_id"`
	MemberID      string  `json:"member_id"`
	SessionID     string  `json:"session_id"`
	SessionTitle  string  `json:"session_title"`
	Amount        float64 `json:"amount"`
	VANumber      string  `json:"bni_va_number"`
	Signature     string  `json:"bni_signature"`
	Status        string  `json:"status"`
	CreatedAt     string  `json:"created_at"`
	PaidAt        *string `json:"paid_at,omitempty"`
}

type SmartOption struct {
	ID                  string  `json:"id"`
	Type                string  `json:"type"`
	Title               string  `json:"title"`
	Badge               string  `json:"badge"`
	Highlight           string  `json:"highlight"`
	Description         string  `json:"description"`
	TargetSessionID     string  `json:"target_session_id,omitempty"`
	TargetSessionTitle  string  `json:"target_session_title,omitempty"`
	TargetSessionTime   string  `json:"target_session_time,omitempty"`
	PriceAdjustmentIDR  float64 `json:"price_adjustment_idr"`
	OriginalPriceIDR    float64 `json:"original_price_idr,omitempty"`
	DiscountLabel       string  `json:"discount_label,omitempty"`
	AvailableSlots      int     `json:"available_slots"`
	ActionLabel         string  `json:"action_label"`
}
