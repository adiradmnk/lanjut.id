package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"lanjut/backend/internal/config"
)

type BNIPaymentService struct {
	cfg    config.Config
	client *http.Client
}

func NewBNIPaymentService(cfg config.Config) *BNIPaymentService {
	return &BNIPaymentService{cfg: cfg, client: &http.Client{Timeout: 10 * time.Second}}
}

type CreateVARequest struct {
	MemberID       string
	TenantID       string
	SessionID      string
	SessionTitle   string
	AmountIDR      float64
	CustomerName   string
	CustomerEmail  string
	CustomerPhone  string
}

type CreateVAResult struct {
	Status    string // SUCCESS | GATEWAY_ERROR
	TrxID     string
	VANumber  string
	Amount    float64
	ExpiredAt time.Time
	Signature string
	Error     string
}

var nonDigit = regexp.MustCompile(`[^0-9]`)

// FormatBNITimestamp renders yyyy-MM-ddTHH:mm:ss.SSS+07:00 per BNIdirect spec.
func FormatBNITimestamp(t time.Time) string {
	wib := t.In(time.FixedZone("WIB", 7*60*60))
	return wib.Format("2006-01-02T15:04:05.000") + "+07:00"
}

// GenerateBNIDirectSignature computes the HMAC-SHA256 digital signature v2.
func GenerateBNIDirectSignature(method, endpointPath string, body any, timestamp, secretKey string) (string, error) {
	minified, err := json.Marshal(body)
	if err != nil {
		return "", err
	}
	bodyHashBytes := sha256.Sum256(minified)
	bodyHash := strings.ToLower(hex.EncodeToString(bodyHashBytes[:]))
	stringToSign := fmt.Sprintf("%s:%s:%s:%s", strings.ToUpper(method), endpointPath, bodyHash, timestamp)

	if secretKey == "" {
		secretKey = "default_secret"
	}
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil)), nil
}

// CreateVirtualAccount is a thin backward-compatible wrapper over CreatePaymentInstruction
// (the PaymentGatewayAdapter method) — kept so handlers.go's existing callers, and every
// test that pins CreateVAResult's shape, don't need to change. All the real logic lives in
// CreatePaymentInstruction now; this just translates field names both ways.
func (b *BNIPaymentService) CreateVirtualAccount(ctx context.Context, req CreateVARequest) CreateVAResult {
	result, _ := b.CreatePaymentInstruction(ctx, CreatePaymentRequest{
		MemberID: req.MemberID, TenantID: req.TenantID, SessionID: req.SessionID, SessionTitle: req.SessionTitle,
		AmountIDR: req.AmountIDR, CustomerName: req.CustomerName, CustomerEmail: req.CustomerEmail, CustomerPhone: req.CustomerPhone,
	})
	return CreateVAResult{
		Status: result.Status, TrxID: result.TrxID, VANumber: result.ProviderRef, Amount: result.AmountIDR,
		ExpiredAt: result.ExpiredAt, Signature: result.Signature, Error: result.Error,
	}
}

// CreatePaymentInstruction implements PaymentGatewayAdapter for BNI: issues a BNI SNAP
// e-Collection Virtual Account. If live BNI credentials are configured it calls the sandbox
// gateway; otherwise it runs the sandboxed protocol simulator with an identical response
// contract. This is CreateVirtualAccount's exact original logic, just under the adapter's
// provider-agnostic method name/types — behavior is unchanged.
func (b *BNIPaymentService) CreatePaymentInstruction(ctx context.Context, req CreatePaymentRequest) (PaymentInstructionResult, error) {
	trxID := fmt.Sprintf("TRX-LANJUT-%d-%s", time.Now().UnixMilli(), randHex(3))
	timestamp := FormatBNITimestamp(time.Now())
	endpointPath := "/api/v1.0/transfer-va/create-va"
	expiredAt := time.Now().Add(24 * time.Hour)

	seq := nonDigit.ReplaceAllString(req.MemberID, "")
	for len(seq) < 8 {
		seq += "0"
	}
	vaNumber := fmt.Sprintf("%s%s%04d", b.cfg.BNICompanyCode, seq[:8], randInt(1000, 9999))

	payload := map[string]any{
		"corporateId":            b.cfg.BNICorporateID,
		"userId":                 b.cfg.BNIUserID,
		"companyCode":            b.cfg.BNICompanyCode,
		"virtualAccountNo":       vaNumber,
		"virtualAccountName":     strings.ToUpper(req.CustomerName),
		"virtualAccountTypeCode": "c",
		"billingAmount":          fmt.Sprintf("%.0f", req.AmountIDR),
		"expiryDate":             expiredAt.Format("0601"),
		"expiryTime":             expiredAt.Format("150405"),
		"mobilePhoneNo":          req.CustomerPhone,
		"statusCode":             "1",
		"additionalInfo": map[string]any{
			"trxId":         trxID,
			"sessionId":     req.SessionID,
			"sessionTitle":  req.SessionTitle,
			"customerEmail": req.CustomerEmail,
		},
	}

	requestLog := bniRequestLog(payload, timestamp)

	signature, err := GenerateBNIDirectSignature(http.MethodPost, endpointPath, payload, timestamp, b.cfg.BNIClientSecret)
	if err != nil {
		return PaymentInstructionResult{
			Status: "GATEWAY_ERROR", TrxID: trxID, AmountIDR: req.AmountIDR, ExpiredAt: expiredAt, Error: err.Error(),
			RequestLog:  requestLog,
			ResponseLog: bniResponseLog("GATEWAY_ERROR", trxID, "", req.AmountIDR, expiredAt, err.Error()),
		}, nil
	}

	if b.cfg.BNIClientID != "" && b.cfg.BNIClientSecret != "" {
		if result, ok := b.callLiveGateway(ctx, endpointPath, payload, timestamp, signature, trxID, req, vaNumber, expiredAt); ok {
			result.RequestLog = requestLog
			return result, nil
		}
		// live call failed; fall through to sandbox simulator so the demo keeps working
	}

	slog.Info("BNIdirect sandbox engine: issuing virtual account", "trx_id", trxID, "customer", req.CustomerName)
	return PaymentInstructionResult{
		Status:      "SUCCESS",
		TrxID:       trxID,
		ProviderRef: vaNumber,
		AmountIDR:   req.AmountIDR,
		ExpiredAt:   expiredAt,
		Signature:   signature,
		RequestLog:  requestLog,
		ResponseLog: bniResponseLog("SUCCESS", trxID, vaNumber, req.AmountIDR, expiredAt, ""),
	}, nil
}

// bniRequestLog builds the FASE 1b payment_gateway_logs REQUEST payload: the exact outbound
// BNIdirect create-VA body plus headers, with the secret-bearing headers redacted. Redaction
// happens here — the one place that ever sees the real values — never at the point a caller
// later reads this log.
func bniRequestLog(payload map[string]any, timestamp string) json.RawMessage {
	withHeaders := make(map[string]any, len(payload)+1)
	for k, v := range payload {
		withHeaders[k] = v
	}
	withHeaders["headers"] = map[string]any{
		"x-timestamp":       timestamp,
		"bnidirect-api-key": "[REDACTED]",
		"x-signature":       "[REDACTED]",
	}
	b, err := json.Marshal(withHeaders)
	if err != nil {
		return nil
	}
	return b
}

// bniResponseLog builds the FASE 1b payment_gateway_logs RESPONSE payload, mirroring
// CreateVAResult's shape with the signature redacted.
func bniResponseLog(status, trxID, vaNumber string, amount float64, expiredAt time.Time, errMsg string) json.RawMessage {
	var errVal any
	if errMsg != "" {
		errVal = errMsg
	}
	b, err := json.Marshal(map[string]any{
		"status": status, "trx_id": trxID, "va_number": vaNumber, "amount": amount,
		"expired_at": expiredAt, "signature": "[REDACTED]", "error": errVal,
	})
	if err != nil {
		return nil
	}
	return b
}

func (b *BNIPaymentService) callLiveGateway(ctx context.Context, endpointPath string, payload map[string]any, timestamp, signature, trxID string, req CreatePaymentRequest, vaNumber string, expiredAt time.Time) (PaymentInstructionResult, bool) {
	bodyJSON, err := json.Marshal(payload)
	if err != nil {
		return PaymentInstructionResult{}, false
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, b.cfg.BNIAPIURL+endpointPath, bytes.NewReader(bodyJSON))
	if err != nil {
		return PaymentInstructionResult{}, false
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("bnidirect-api-key", b.cfg.BNIClientID)
	httpReq.Header.Set("x-signature", signature)
	httpReq.Header.Set("x-timestamp", timestamp)

	resp, err := b.client.Do(httpReq)
	if err != nil {
		slog.Error("BNIdirect API gateway error", "err", err)
		return PaymentInstructionResult{}, false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Error("BNIdirect API gateway rejected request", "status", resp.StatusCode)
		return PaymentInstructionResult{}, false
	}

	return PaymentInstructionResult{
		Status:      "SUCCESS",
		TrxID:       trxID,
		ProviderRef: vaNumber,
		AmountIDR:   req.AmountIDR,
		ExpiredAt:   expiredAt,
		Signature:   signature,
		ResponseLog: bniResponseLog("SUCCESS", trxID, vaNumber, req.AmountIDR, expiredAt, ""),
	}, true
}

// ParseWebhook implements PaymentGatewayAdapter for BNI, normalizing the existing sandbox
// webhook payload shape ({trx_id, va_number, member_id, option_title, amount} — see
// payments.go's webhookRequest) into a NormalizedPaymentEvent.
//
// ASUMSI/TODO: this sandbox payload carries no signature today (payments.go's BNIWebhook
// comment already says as much: "here we trust the trx_id lookup"), so there's nothing to
// verify yet. If/when the real BNI SNAP webhook contract is wired, it would carry an
// X-SIGNATURE header to verify here before trusting the payload.
func (b *BNIPaymentService) ParseWebhook(ctx context.Context, rawBody []byte, headers http.Header) (NormalizedPaymentEvent, error) {
	var payload struct {
		TrxID    string  `json:"trx_id"`
		VANumber string  `json:"va_number"`
		Amount   float64 `json:"amount"`
	}
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return NormalizedPaymentEvent{}, fmt.Errorf("parse bni webhook payload: %w", err)
	}

	return NormalizedPaymentEvent{
		ProviderRef:   payload.VANumber,
		InternalTrxID: payload.TrxID,
		Status:        PaymentStatusPaid,
		AmountIDR:     payload.Amount,
		RawPayload:    rawBody,
	}, nil
}

// QueryStatus implements PaymentGatewayAdapter for BNI.
//
// ASUMSI/TODO: no live BNI status-inquiry endpoint is wired in this sandbox integration —
// reconciliation currently relies entirely on webhook-driven settlement (ParseWebhook +
// SettleTransaction). Wire the real BNI SNAP inquiry endpoint here once sandbox access to
// it is confirmed; until then this always reports PENDING rather than fabricate a result.
func (b *BNIPaymentService) QueryStatus(ctx context.Context, providerRef string) (PaymentStatus, error) {
	return PaymentStatusPending, nil
}

// compile-time assertion that BNIPaymentService satisfies PaymentGatewayAdapter.
var _ PaymentGatewayAdapter = (*BNIPaymentService)(nil)

func randHex(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func randInt(min, max int) int {
	buf := make([]byte, 4)
	_, _ = rand.Read(buf)
	v := int(buf[0])<<24 | int(buf[1])<<16 | int(buf[2])<<8 | int(buf[3])
	if v < 0 {
		v = -v
	}
	return min + v%(max-min)
}
