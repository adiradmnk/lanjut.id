package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"mime/multipart"
	"net/http"
	"time"

	"lanjut/backend/internal/models"
)

type AIGateway struct {
	baseURL string
	// client is for the fast, customer-facing path (RankSmartOptions): a tight 500ms
	// circuit breaker so the member portal never blocks on the AI sidecar.
	client *http.Client
	// slowClient is for heavier, non-latency-sensitive operations explicitly allowed to
	// take longer — grounding a Gemini call on a full guidebook document (GenerateOffers)
	// or parsing an uploaded PDF/docx (ExtractDocumentText). Both are manually-triggered
	// "boleh dipanggil kapan saja" operations per the brief, not part of the hot path.
	slowClient *http.Client
}

func NewAIGateway(baseURL string) *AIGateway {
	return &AIGateway{
		baseURL:    baseURL,
		client:     &http.Client{Timeout: 500 * time.Millisecond},
		slowClient: &http.Client{Timeout: 20 * time.Second},
	}
}

type rankSessionInput struct {
	ID                 string  `json:"id"`
	Title              string  `json:"title"`
	DayOfWeek          string  `json:"day_of_week"`
	TimeSlot           string  `json:"time_slot"`
	TimeOfDay          string  `json:"time_of_day"`
	TotalCapacity      int     `json:"total_capacity"`
	BookedSlots        int     `json:"booked_slots"`
	PricePerSessionIDR float64 `json:"price_per_session_idr"`
}

type rankSmartOptionsRequest struct {
	MemberID          string               `json:"member_id"`
	MemberName        string               `json:"member_name"`
	RemainingQuota    int                  `json:"remaining_quota"`
	DaysToExpiry      int                  `json:"days_to_expiry"`
	TenantConstraint  *models.TenantConfig `json:"tenant_constraint,omitempty"`
	AvailableSessions []rankSessionInput   `json:"available_sessions"`
}

type rankSmartOptionsResponse struct {
	Options []models.SmartOption `json:"options"`
}

// RankSmartOptions calls the FastAPI sidecar with a fast 500ms SLA; on any error
// (offline, timeout, malformed response) it falls back to the deterministic local
// engine within microseconds instead of blocking the member portal.
func (a *AIGateway) RankSmartOptions(ctx context.Context, member *models.Member, tenant *models.Tenant, sessions []models.ClassSession) []models.SmartOption {
	sessInputs := make([]rankSessionInput, 0, len(sessions))
	for _, s := range sessions {
		sessInputs = append(sessInputs, rankSessionInput{
			ID: s.ID, Title: s.Title, DayOfWeek: s.DayOfWeek, TimeSlot: s.TimeSlot,
			TimeOfDay: s.TimeOfDay, TotalCapacity: s.TotalCapacity, BookedSlots: s.BookedSlots,
			PricePerSessionIDR: s.PricePerSessionIDR,
		})
	}

	reqBody := rankSmartOptionsRequest{
		MemberID:          member.ID,
		MemberName:        member.Name,
		RemainingQuota:    max(0, member.TotalQuota-member.UsedQuota),
		DaysToExpiry:      7,
		AvailableSessions: sessInputs,
	}
	if tenant != nil {
		reqBody.TenantConstraint = &tenant.Config
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return GenerateSmartOptions(member, tenant, sessions)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost,
		a.baseURL+"/api/v1/retention/rank-smart-options", bytes.NewReader(bodyJSON))
	if err != nil {
		return GenerateSmartOptions(member, tenant, sessions)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		slog.Info("ai gateway offline/timeout, using local deterministic engine", "err", err)
		return GenerateSmartOptions(member, tenant, sessions)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return GenerateSmartOptions(member, tenant, sessions)
	}

	var out rankSmartOptionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil || len(out.Options) == 0 {
		return GenerateSmartOptions(member, tenant, sessions)
	}
	return out.Options
}

type offerPackageInput struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	PriceIDR      float64 `json:"price_idr"`
	QuotaSessions int     `json:"quota_sessions"`
	DurationDays  int     `json:"duration_days"`
	BillingType   string  `json:"billing_type"`
}

type generateOffersRequest struct {
	MemberID          string               `json:"member_id"`
	MemberName        string               `json:"member_name"`
	TenantConstraint  *models.TenantConfig `json:"tenant_constraint,omitempty"`
	ActivePackages    []offerPackageInput  `json:"active_packages"`
	AvailableSessions []rankSessionInput   `json:"available_sessions"`
	// GuidebookContext is the extracted text of the merchant's uploaded guidebook document
	// (catalog/policy/payment details) — see storage.go / ExtractDocumentText. When present,
	// the sidecar grounds its Gemini prompt on this instead of guessing at merchant policy.
	GuidebookContext string `json:"guidebook_context,omitempty"`
}

type generateOffersResponse struct {
	Offers []models.OfferCandidate `json:"offers"`
}

// GenerateOffers calls the FastAPI sidecar (with guidebookContext, if any, for grounding)
// using the slow client — this is a manually-triggered, non-latency-sensitive operation, so
// it's allowed to actually wait on a Gemini call rather than circuit-break at 500ms like the
// customer-facing RankSmartOptions path does. On any failure (offline, timeout, malformed
// response) it falls back to the local deterministic generator. The AI never approves
// anything here — it only proposes candidates; the caller must still run every candidate
// through ValidateOfferConstraint and, beyond that, the mandatory merchant approval gate
// before a customer ever sees it.
func (a *AIGateway) GenerateOffers(ctx context.Context, member *models.Member, tenant *models.Tenant, packages []models.ProductPackage, sessions []models.ClassSession, guidebookContext string) []models.OfferCandidate {
	pkgInputs := make([]offerPackageInput, 0, len(packages))
	for _, p := range packages {
		pkgInputs = append(pkgInputs, offerPackageInput{
			ID: p.ID, Name: p.Name, PriceIDR: p.PriceIDR, QuotaSessions: p.QuotaSessions,
			DurationDays: p.DurationDays, BillingType: p.BillingType,
		})
	}
	sessInputs := make([]rankSessionInput, 0, len(sessions))
	for _, s := range sessions {
		sessInputs = append(sessInputs, rankSessionInput{
			ID: s.ID, Title: s.Title, DayOfWeek: s.DayOfWeek, TimeSlot: s.TimeSlot,
			TimeOfDay: s.TimeOfDay, TotalCapacity: s.TotalCapacity, BookedSlots: s.BookedSlots,
			PricePerSessionIDR: s.PricePerSessionIDR,
		})
	}

	reqBody := generateOffersRequest{
		MemberID: member.ID, MemberName: member.Name,
		ActivePackages: pkgInputs, AvailableSessions: sessInputs,
		GuidebookContext: guidebookContext,
	}
	if tenant != nil {
		reqBody.TenantConstraint = &tenant.Config
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return GenerateOfferCandidates(member, tenant, packages, sessions)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost,
		a.baseURL+"/api/v1/retention/generate-offers", bytes.NewReader(bodyJSON))
	if err != nil {
		return GenerateOfferCandidates(member, tenant, packages, sessions)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.slowClient.Do(req)
	if err != nil {
		slog.Info("ai gateway offline/timeout, using local deterministic offer generator", "err", err)
		return GenerateOfferCandidates(member, tenant, packages, sessions)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return GenerateOfferCandidates(member, tenant, packages, sessions)
	}

	var out generateOffersResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil || len(out.Offers) == 0 {
		return GenerateOfferCandidates(member, tenant, packages, sessions)
	}
	return out.Offers
}

// ExtractDocumentText uploads a raw document (PDF/docx/txt) to the AI sidecar's parser and
// returns the extracted plain text, so it can be stored as a guidebook's grounding context.
// Unlike the other AIGateway methods there is no local fallback here — Go has no reasonable
// PDF/docx parser to fall back to, so a sidecar failure is returned as an error and the
// upload handler decides how to degrade (still save the file, just without grounding text).
func (a *AIGateway) ExtractDocumentText(ctx context.Context, filename, contentType string, data []byte) (string, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", fmt.Errorf("create form file: %w", err)
	}
	if _, err := part.Write(data); err != nil {
		return "", fmt.Errorf("write form file: %w", err)
	}
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("close multipart writer: %w", err)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost,
		a.baseURL+"/api/v1/documents/extract-text", &body)
	if err != nil {
		return "", fmt.Errorf("build extract-text request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := a.slowClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ai sidecar unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ai sidecar returned status %d", resp.StatusCode)
	}

	var out struct {
		ExtractedText string `json:"extracted_text"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("decode extract-text response: %w", err)
	}
	return out.ExtractedText, nil
}

// GrievanceTranslation is the structured result of running a customer's free-text complaint
// through the AI sidecar's /translate-grievance endpoint.
type GrievanceTranslation struct {
	Intent             string
	Category           string
	PreferredTimeOfDay string
	PreferredDays      []string
	ChurnRiskScore     float64
	Sentiment          string
	RootCauseSummary   string
	RecommendedAction  string
	EngineSource       string
}

type translateGrievanceRequest struct {
	MemberName        string               `json:"member_name"`
	FreeTextComplaint string               `json:"free_text_complaint"`
	CurrentPackage    string               `json:"current_package,omitempty"`
	TenantConstraint  *models.TenantConfig `json:"tenant_constraint,omitempty"`
}

// TranslateGrievance calls the FastAPI sidecar's /translate-grievance endpoint (which has
// its own internal Gemini-or-deterministic-fallback, so it should succeed whenever the
// sidecar is reachable at all). Unlike the other AIGateway methods there is no local
// fallback here — the caller (feedback handler) decides how to degrade if the sidecar is
// genuinely unreachable: it still saves the raw complaint, just without structured fields.
func (a *AIGateway) TranslateGrievance(ctx context.Context, memberName, complaint, currentPackage string, tenant *models.Tenant) (*GrievanceTranslation, error) {
	reqBody := translateGrievanceRequest{
		MemberName:        memberName,
		FreeTextComplaint: complaint,
		CurrentPackage:    currentPackage,
	}
	if tenant != nil {
		reqBody.TenantConstraint = &tenant.Config
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost,
		a.baseURL+"/api/v1/retention/translate-grievance", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.slowClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai sidecar unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai sidecar returned status %d", resp.StatusCode)
	}

	var out struct {
		Intent             string   `json:"intent"`
		Category           string   `json:"category"`
		PreferredTimeOfDay string   `json:"preferred_time_of_day"`
		PreferredDays      []string `json:"preferred_days"`
		ChurnRiskScore     float64  `json:"churn_risk_score"`
		Sentiment          string   `json:"sentiment"`
		RootCauseSummary   string   `json:"root_cause_summary"`
		RecommendedAction  string   `json:"recommended_action"`
		EngineSource       string   `json:"engine_source"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode translate-grievance response: %w", err)
	}

	return &GrievanceTranslation{
		Intent: out.Intent, Category: out.Category, PreferredTimeOfDay: out.PreferredTimeOfDay,
		PreferredDays: out.PreferredDays, ChurnRiskScore: out.ChurnRiskScore, Sentiment: out.Sentiment,
		RootCauseSummary: out.RootCauseSummary, RecommendedAction: out.RecommendedAction, EngineSource: out.EngineSource,
	}, nil
}

// RMSummaryInput is the pre-aggregated tenant data (see store.GetTenantInsightStats) that
// GenerateRMSummary sends to the sidecar for narrative generation.
type RMSummaryInput struct {
	MerchantName        string
	TotalMembers        int
	AtRiskMembers       int
	SavedThisMonth      int
	RetentionRatePct    float64
	AvgAttendancePct    float64
	TopChurnReason      string
	EstBNIVATurnoverIDR int64
}

// RMSummary is the narrative/insight result of GenerateRMSummary: a human-readable read on
// a tenant's health, built from real transaction + feedback aggregates rather than guessed.
type RMSummary struct {
	MerchantName              string   `json:"merchant_name"`
	HealthStatus              string   `json:"health_status"`
	BNIRMPriority             string   `json:"bni_rm_priority"`
	NarrativeSummary          []string `json:"narrative_summary"`
	ActionableRecommendations []string `json:"actionable_recommendations"`
	ComplianceGuarantee       string   `json:"compliance_guarantee"`
}

type generateRMSummaryRequest struct {
	MerchantName        string  `json:"merchant_name"`
	TotalMembers        int     `json:"total_members"`
	AtRiskMembers       int     `json:"at_risk_members"`
	SavedThisMonth      int     `json:"saved_this_month"`
	RetentionRatePct    float64 `json:"retention_rate_pct"`
	AvgAttendancePct    float64 `json:"avg_attendance_pct"`
	TopChurnReason      string  `json:"top_churn_reason"`
	EstBNIVATurnoverIDR int64   `json:"est_bni_va_turnover_idr"`
}

// GenerateRMSummary calls the FastAPI sidecar's existing /generate-rm-summary endpoint
// (deterministic health-status templating, not an LLM call) with real aggregated
// transaction + feedback data — this is what turns "riwayat transaksi + feedback" into an
// actual narrative insight for the merchant/RM dashboards, rather than raw table dumps.
// There is no local fallback: if the sidecar is unreachable, the caller (the insights
// handler) still has the raw stats to show and just omits the narrative.
func (a *AIGateway) GenerateRMSummary(ctx context.Context, in RMSummaryInput) (*RMSummary, error) {
	reqBody := generateRMSummaryRequest{
		MerchantName: in.MerchantName, TotalMembers: in.TotalMembers, AtRiskMembers: in.AtRiskMembers,
		SavedThisMonth: in.SavedThisMonth, RetentionRatePct: in.RetentionRatePct,
		AvgAttendancePct: in.AvgAttendancePct, TopChurnReason: in.TopChurnReason,
		EstBNIVATurnoverIDR: in.EstBNIVATurnoverIDR,
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost,
		a.baseURL+"/api/v1/retention/generate-rm-summary", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.slowClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai sidecar unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai sidecar returned status %d", resp.StatusCode)
	}

	var out RMSummary
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode generate-rm-summary response: %w", err)
	}
	return &out, nil
}

// SMECreditDSSInput is the pre-aggregated tenant data (loan terms + real VA turnover from
// store.GetTenantInsightStats) sent to the sidecar's DSCR-based credit decision support
// endpoint. This is the same /evaluate-sme-credit-dss logic the old Express prototype
// (backend/src/services/aiGatewayService.ts) called — wired here so backend-go's BNI RM
// dashboard gets a real DSCR figure instead of a hardcoded placeholder.
type SMECreditDSSInput struct {
	MerchantID            string
	MerchantName          string
	MonthlyInstallmentIDR int64
	MonthlyVATurnoverIDR  int64
	RetentionRatePct      float64
	ActiveMemberCount     int
}

type SMECreditDSS struct {
	MerchantID              string   `json:"merchant_id"`
	MerchantName            string   `json:"merchant_name"`
	CreditHealthRating      string   `json:"credit_health_rating"`
	BNIDSCRRatio            float64  `json:"bni_dscr_ratio"`
	SMECreditReadinessIndex string   `json:"sme_credit_readiness_index"`
	RecommendedRMAction     string   `json:"recommended_rm_action"`
	AIRiskRationale         []string `json:"ai_risk_rationale"`
	ComplianceDisclaimer    string   `json:"compliance_disclaimer"`
}

type evaluateSMECreditRequest struct {
	MerchantID            string  `json:"merchant_id"`
	MerchantName          string  `json:"merchant_name"`
	MonthlyInstallmentIDR int64   `json:"monthly_installment_idr"`
	MonthlyVATurnoverIDR  int64   `json:"monthly_bni_va_turnover_idr"`
	RetentionRatePct      float64 `json:"retention_rate_pct"`
	ActiveMemberCount     int     `json:"active_member_count"`
}

// EvaluateSMECreditDSS calls the sidecar's deterministic DSCR calculator (turnover /
// installment, no LLM involved) so BNI RM sees a real credit-health figure per merchant
// instead of a static placeholder. No local fallback: if the sidecar is unreachable, the
// caller still has the raw loan/turnover numbers and can render without a rating.
func (a *AIGateway) EvaluateSMECreditDSS(ctx context.Context, in SMECreditDSSInput) (*SMECreditDSS, error) {
	reqBody := evaluateSMECreditRequest{
		MerchantID: in.MerchantID, MerchantName: in.MerchantName,
		MonthlyInstallmentIDR: in.MonthlyInstallmentIDR, MonthlyVATurnoverIDR: in.MonthlyVATurnoverIDR,
		RetentionRatePct: in.RetentionRatePct, ActiveMemberCount: in.ActiveMemberCount,
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost,
		a.baseURL+"/api/v1/retention/evaluate-sme-credit-dss", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.slowClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai sidecar unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai sidecar returned status %d", resp.StatusCode)
	}

	var out SMECreditDSS
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode evaluate-sme-credit-dss response: %w", err)
	}
	return &out, nil
}

type GuidebookExtractResponse struct {
	Status               string                        `json:"status"`
	Filename             string                        `json:"filename"`
	ExtractedTextPreview string                        `json:"extracted_text_preview"`
	EngineSource         string                        `json:"engine_source"`
	ProcessingTimeMs     float64                       `json:"processing_time_ms"`
	Rules                models.ExtractedBusinessRules `json:"rules"`
}

func (a *AIGateway) ExtractBusinessRulesFromText(ctx context.Context, filename, rawText string) (*GuidebookExtractResponse, error) {
	reqPayload := map[string]string{
		"filename": filename,
		"raw_text": rawText,
	}
	bodyJSON, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, err
	}

	reqCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/guidebook/extract-rules", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		slog.Warn("AI Service extraction call failed, falling back to local defaults", "err", err)
		return a.fallbackBusinessRules(filename, rawText), nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Warn("AI Service extraction returned non-200", "status", resp.StatusCode)
		return a.fallbackBusinessRules(filename, rawText), nil
	}

	var res GuidebookExtractResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return a.fallbackBusinessRules(filename, rawText), nil
	}
	return &res, nil
}

func (a *AIGateway) fallbackBusinessRules(filename, rawText string) *GuidebookExtractResponse {
	return &GuidebookExtractResponse{
		Status:               "SUCCESS",
		Filename:             filename,
		ExtractedTextPreview: rawText,
		EngineSource:         "LANJUT Local Rule Fallback Engine",
		ProcessingTimeMs:     2.0,
		Rules: models.ExtractedBusinessRules{
			BusinessProfile: models.BusinessProfile{
				BusinessName:   "Partner Merchant UMKM",
				Category:       "Fitness & Wellness Studio",
				OperatingHours: "Senin - Sabtu: 07:00 - 21:00 WIB",
				Summary:        "Inisialisasi profil bisnis standar dari guidebook pendaftaran BNI.",
			},
			FinancialConstraints: models.FinancialConstraints{
				MaxDiscountAllowedPct: 15.0,
				MinMarginFloorIDR:     50000.0,
				Currency:              "IDR",
				Rationale:             "Batas aman margin default untuk menjaga kelayakan angsuran BNI.",
			},
			ProductCatalog: []models.ProductItem{
				{
					Name:          "Paket Reguler 8 Sesi",
					PriceIDR:      1200000.0,
					QuotaSessions: 8,
					ValidityDays:  30,
					Description:   "Akses 8 sesi kelas tatap muka bulanan",
				},
			},
			CancellationTriggers: []models.CancellationTrigger{
				{
					TriggerPattern:     "Jadwal bentrok / WFO",
					RecommendedAction:  "SWITCH_SCHEDULE_OFF_PEAK",
					AllowedDiscountPct: 10.0,
					Description:        "Pindah ke jadwal malam atau akhir pekan",
				},
				{
					TriggerPattern:     "Kendala biaya",
					RecommendedAction:  "DOWNSIZE_TIER_WITH_MARGIN_LOCK",
					AllowedDiscountPct: 15.0,
					Description:        "Tawarkan paket fleksibel dengan margin terkunci",
				},
			},
			RetentionPolicy: models.RetentionPolicy{
				FreeFreezeAllowed:     true,
				MaxFreezeDays:         30,
				AllowReschedule:       true,
				RescheduleNoticeHours: 12,
				RefundPolicy:          "Pro-rata refund kebijakan merchant",
			},
		},
	}
}

// PredictMLChurn proxies telco/subscription ML prediction to AI engine
func (a *AIGateway) PredictMLChurn(ctx context.Context, payload map[string]any) (map[string]any, error) {
	bodyJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	reqCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/retention/ml-churn/predict", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

// SimulateMLChurn proxies what-if parameter scenario to AI engine
func (a *AIGateway) SimulateMLChurn(ctx context.Context, payload map[string]any) (map[string]any, error) {
	bodyJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/retention/ml-churn/simulate", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

// GetMLChurnAnalytics proxies demographic and churn analytics to AI engine
func (a *AIGateway) GetMLChurnAnalytics(ctx context.Context, payload map[string]any) (map[string]any, error) {
	bodyJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/retention/ml-churn/analytics", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

// BatchPredictChurnVelocity calls the batch inference engine for stress tests
func (a *AIGateway) BatchPredictChurnVelocity(ctx context.Context, payload map[string]any) (map[string]any, error) {
	bodyJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/retention/predict-churn-batch", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

// GenerateCancellationSurvey triggers Vercel AI SDK style dynamic empathy survey
func (a *AIGateway) GenerateCancellationSurvey(ctx context.Context, member *models.Member, tenant *models.Tenant, lastTrx map[string]any) (map[string]any, error) {
	reqBody := map[string]any{
		"member_id":        member.ID,
		"member_name":      member.Name,
		"last_transaction": lastTrx,
	}
	if tenant != nil {
		reqBody["business_rules"] = map[string]any{
			"business_profile": map[string]any{
				"business_name": tenant.BusinessName,
				"category":      tenant.Category,
			},
			"financial_constraints": map[string]any{
				"max_discount_allowed_pct": tenant.Config.MaxDiscountPct,
				"min_margin_floor_idr":     tenant.Config.MinMarginFloorIDR,
			},
		}
	}
	bodyJSON, _ := json.Marshal(reqBody)
	reqCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/lifecycle/generate-cancellation-survey", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

// AnalyzeSurveyFeedback triggers RAG retention offer generation with guaranteed margin lock
func (a *AIGateway) AnalyzeSurveyFeedback(ctx context.Context, member *models.Member, selectedOptions []string, freeText string, tenant *models.Tenant) (map[string]any, error) {
	reqBody := map[string]any{
		"member_id":            member.ID,
		"member_name":          member.Name,
		"selected_option_ids":  selectedOptions,
		"free_text_feedback":   freeText,
	}
	if tenant != nil {
		reqBody["business_rules"] = map[string]any{
			"business_profile": map[string]any{
				"business_name": tenant.BusinessName,
				"category":      tenant.Category,
			},
			"financial_constraints": map[string]any{
				"max_discount_allowed_pct": tenant.Config.MaxDiscountPct,
				"min_margin_floor_idr":     tenant.Config.MinMarginFloorIDR,
			},
		}
	}
	bodyJSON, _ := json.Marshal(reqBody)
	reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/lifecycle/analyze-survey-feedback", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

// ProcessMerchantChatbotInstruction proxies conversational business logic builder to LangChain agent
func (a *AIGateway) ProcessMerchantChatbotInstruction(ctx context.Context, tenant *models.Tenant, userMessage string) (map[string]any, error) {
	reqBody := map[string]any{
		"user_message": userMessage,
		"current_rules": map[string]any{
			"business_profile": map[string]any{
				"business_name": tenant.BusinessName,
				"category":      tenant.Category,
			},
			"financial_constraints": map[string]any{
				"max_discount_allowed_pct": tenant.Config.MaxDiscountPct,
				"min_margin_floor_idr":     tenant.Config.MinMarginFloorIDR,
			},
		},
	}
	bodyJSON, _ := json.Marshal(reqBody)
	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, a.baseURL+"/api/v1/chatbot/process-instruction", bytes.NewReader(bodyJSON))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.slowClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out, nil
}

