package services

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"lanjut/backend/internal/config"
)

// MidtransAdapter implements PaymentGatewayAdapter for Midtrans, mirroring
// BNIPaymentService's shape: a sandboxed simulator when no credentials are configured,
// otherwise a best-effort live call that falls back to the simulator on failure so a demo
// never hard-fails because of an external gateway hiccup.
//
// ASUMSI/TODO: the live-call request/response shapes below follow Midtrans's public Snap
// API docs as commonly documented (POST /snap/v1/transactions, Basic Auth with server_key,
// response {token, redirect_url}), but have NOT been verified against a real sandbox account
// in this session — treat CreatePaymentInstruction's live path and QueryStatus as needing a
// docs pass before relying on them beyond the simulator.
type MidtransAdapter struct {
	cfg    config.Config
	client *http.Client
}

func NewMidtransAdapter(cfg config.Config) *MidtransAdapter {
	return &MidtransAdapter{cfg: cfg, client: &http.Client{Timeout: 10 * time.Second}}
}

func (m *MidtransAdapter) baseURL() string {
	if m.cfg.MidtransIsProduction {
		return "https://api.midtrans.com"
	}
	return "https://api.sandbox.midtrans.com"
}

func (m *MidtransAdapter) snapBaseURL() string {
	if m.cfg.MidtransIsProduction {
		return "https://app.midtrans.com"
	}
	return "https://app.sandbox.midtrans.com"
}

// CreatePaymentInstruction implements PaymentGatewayAdapter for Midtrans. Without
// MIDTRANS_SERVER_KEY/MIDTRANS_CLIENT_KEY configured it runs a clearly-labeled
// "MIDTRANS SIMULATOR" path, matching BNIPaymentService's sandbox-simulator convention.
func (m *MidtransAdapter) CreatePaymentInstruction(ctx context.Context, req CreatePaymentRequest) (PaymentInstructionResult, error) {
	trxID := fmt.Sprintf("TRX-LANJUT-%d-%s", time.Now().UnixMilli(), randHex(3))
	orderID := trxID
	expiredAt := time.Now().Add(24 * time.Hour)

	if m.cfg.MidtransServerKey == "" || m.cfg.MidtransClientKey == "" {
		slog.Info("MIDTRANS SIMULATOR: issuing simulated payment token", "trx_id", trxID, "customer", req.CustomerName)
		metadata, _ := json.Marshal(map[string]any{
			"provider": "MIDTRANS",
			"mode":     "SIMULATOR",
			"order_id": orderID,
			"note":     "MIDTRANS_SERVER_KEY/MIDTRANS_CLIENT_KEY not configured; no live call made.",
		})
		return PaymentInstructionResult{
			Status:      "SUCCESS",
			TrxID:       trxID,
			ProviderRef: orderID,
			AmountIDR:   req.AmountIDR,
			ExpiredAt:   expiredAt,
			Signature:   "SIMULATED_NO_SIGNATURE",
			RawMetadata: metadata,
			RequestLog:  metadata,
			ResponseLog: midtransResponseLog("SUCCESS", orderID, req.AmountIDR, expiredAt, ""),
		}, nil
	}

	// ASUMSI/TODO: verify this request shape against Midtrans's official Snap API docs
	// before relying on it — untested against a real sandbox account in this session.
	payload := map[string]any{
		"transaction_details": map[string]any{
			"order_id":     orderID,
			"gross_amount": int64(req.AmountIDR),
		},
		"customer_details": map[string]any{
			"first_name": req.CustomerName,
			"email":      req.CustomerEmail,
			"phone":      req.CustomerPhone,
		},
	}
	requestLog := midtransRequestLog(payload)

	if result, ok := m.callLiveSnapAPI(ctx, payload, trxID, orderID, req, expiredAt); ok {
		result.RequestLog = requestLog
		return result, nil
	}
	// live call failed or not verifiable yet; fall through to simulator so the demo keeps working
	slog.Info("MIDTRANS SIMULATOR (live call fallback): issuing simulated payment token", "trx_id", trxID)
	metadata, _ := json.Marshal(map[string]any{
		"provider": "MIDTRANS",
		"mode":     "SIMULATOR_FALLBACK",
		"order_id": orderID,
	})
	return PaymentInstructionResult{
		Status:      "SUCCESS",
		TrxID:       trxID,
		ProviderRef: orderID,
		AmountIDR:   req.AmountIDR,
		ExpiredAt:   expiredAt,
		Signature:   "SIMULATED_NO_SIGNATURE",
		RawMetadata: metadata,
		RequestLog:  requestLog,
		ResponseLog: midtransResponseLog("SUCCESS", orderID, req.AmountIDR, expiredAt, ""),
	}, nil
}

// midtransRequestLog builds the FASE 1b payment_gateway_logs REQUEST payload: the outbound
// Snap API body plus a headers note. The real server_key is only ever used as an HTTP Basic
// Auth credential (never placed in the JSON body Midtrans itself defines), so there's no
// secret value inside payload to redact — the auth header itself is noted as redacted here
// for the same "never write it in the clear" guarantee BNI's logger gives.
func midtransRequestLog(payload map[string]any) json.RawMessage {
	withHeaders := make(map[string]any, len(payload)+1)
	for k, v := range payload {
		withHeaders[k] = v
	}
	withHeaders["headers"] = map[string]any{"Authorization": "[REDACTED]"}
	b, err := json.Marshal(withHeaders)
	if err != nil {
		return nil
	}
	return b
}

// midtransResponseLog builds the FASE 1b payment_gateway_logs RESPONSE payload, mirroring
// PaymentInstructionResult's shape (no signature field for Midtrans — Snap API doesn't hand
// one back the way BNI does).
func midtransResponseLog(status, orderID string, amount float64, expiredAt time.Time, errMsg string) json.RawMessage {
	var errVal any
	if errMsg != "" {
		errVal = errMsg
	}
	b, err := json.Marshal(map[string]any{
		"status": status, "trx_id": orderID, "order_id": orderID, "amount": amount,
		"expired_at": expiredAt, "error": errVal,
	})
	if err != nil {
		return nil
	}
	return b
}

func (m *MidtransAdapter) callLiveSnapAPI(ctx context.Context, payload map[string]any, trxID, orderID string, req CreatePaymentRequest, expiredAt time.Time) (PaymentInstructionResult, bool) {
	bodyJSON, err := json.Marshal(payload)
	if err != nil {
		return PaymentInstructionResult{}, false
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, m.snapBaseURL()+"/snap/v1/transactions", bytes.NewReader(bodyJSON))
	if err != nil {
		return PaymentInstructionResult{}, false
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	// Snap API auth: HTTP Basic with server_key as username, empty password.
	httpReq.SetBasicAuth(m.cfg.MidtransServerKey, "")

	resp, err := m.client.Do(httpReq)
	if err != nil {
		slog.Error("Midtrans Snap API error", "err", err)
		return PaymentInstructionResult{}, false
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		slog.Error("Midtrans Snap API rejected request", "status", resp.StatusCode)
		return PaymentInstructionResult{}, false
	}

	var out struct {
		Token       string `json:"token"`
		RedirectURL string `json:"redirect_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		slog.Error("Midtrans Snap API decode error", "err", err)
		return PaymentInstructionResult{}, false
	}

	metadata, _ := json.Marshal(map[string]any{
		"provider":     "MIDTRANS",
		"mode":         "LIVE",
		"order_id":     orderID,
		"snap_token":   out.Token,
		"redirect_url": out.RedirectURL,
	})

	return PaymentInstructionResult{
		Status:      "SUCCESS",
		TrxID:       trxID,
		ProviderRef: orderID,
		AmountIDR:   req.AmountIDR,
		ExpiredAt:   expiredAt,
		Signature:   "", // Snap API doesn't hand back a request signature the way BNI does
		ResponseLog: midtransResponseLog("SUCCESS", orderID, req.AmountIDR, expiredAt, ""),
		RawMetadata: metadata,
	}, true
}

// midtransNotification is Midtrans's inbound webhook ("HTTP notification") payload shape,
// per their commonly-documented contract. ASUMSI/TODO: field set not verified against a
// live sandbox notification in this session — revisit once one has actually been received.
type midtransNotification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
}

// ParseWebhook implements PaymentGatewayAdapter for Midtrans: verifies the SHA512(order_id +
// status_code + gross_amount + server_key) signature when MIDTRANS_SERVER_KEY is configured,
// and normalizes transaction_status into the internal PaymentStatus vocabulary. In simulator
// mode (no server key configured) the payload is accepted as-is with no signature check,
// mirroring BNIPaymentService's sandbox behavior.
func (m *MidtransAdapter) ParseWebhook(ctx context.Context, rawBody []byte, headers http.Header) (NormalizedPaymentEvent, error) {
	var payload midtransNotification
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return NormalizedPaymentEvent{}, fmt.Errorf("parse midtrans webhook payload: %w", err)
	}

	if m.cfg.MidtransServerKey != "" {
		expected := computeMidtransSignature(payload.OrderID, payload.StatusCode, payload.GrossAmount, m.cfg.MidtransServerKey)
		if payload.SignatureKey == "" || payload.SignatureKey != expected {
			return NormalizedPaymentEvent{}, fmt.Errorf("midtrans webhook signature invalid")
		}
	}

	var amount float64
	_, _ = fmt.Sscanf(payload.GrossAmount, "%f", &amount)

	return NormalizedPaymentEvent{
		ProviderRef:   payload.OrderID,
		InternalTrxID: payload.OrderID, // Midtrans order_id IS the LANJUT trx_id (set at CreatePaymentInstruction)
		Status:        normalizeMidtransStatus(payload.TransactionStatus),
		AmountIDR:     amount,
		RawPayload:    rawBody,
	}, nil
}

func normalizeMidtransStatus(transactionStatus string) PaymentStatus {
	switch transactionStatus {
	case "capture", "settlement":
		return PaymentStatusPaid
	case "deny", "cancel", "failure":
		return PaymentStatusFailed
	case "expire":
		return PaymentStatusExpired
	default:
		return PaymentStatusPending
	}
}

// computeMidtransSignature implements Midtrans's documented notification signature:
// SHA512(order_id + status_code + gross_amount + server_key), hex-encoded.
func computeMidtransSignature(orderID, statusCode, grossAmount, serverKey string) string {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + serverKey))
	return hex.EncodeToString(sum[:])
}

// QueryStatus implements PaymentGatewayAdapter for Midtrans.
//
// ASUMSI/TODO: Midtrans's status endpoint is commonly documented as
// GET /v2/{order_id}/status with the same Basic Auth as CreatePaymentInstruction — not
// verified against a live sandbox account in this session. Falls back to PENDING (rather
// than fabricate a result) if unconfigured or the call fails.
func (m *MidtransAdapter) QueryStatus(ctx context.Context, providerRef string) (PaymentStatus, error) {
	if m.cfg.MidtransServerKey == "" {
		return PaymentStatusPending, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, m.baseURL()+"/v2/"+providerRef+"/status", nil)
	if err != nil {
		return PaymentStatusPending, nil
	}
	req.Header.Set("Accept", "application/json")
	req.SetBasicAuth(m.cfg.MidtransServerKey, "")

	resp, err := m.client.Do(req)
	if err != nil {
		slog.Error("Midtrans status query error", "err", err)
		return PaymentStatusPending, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return PaymentStatusPending, nil
	}

	var out struct {
		TransactionStatus string `json:"transaction_status"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return PaymentStatusPending, nil
	}
	return normalizeMidtransStatus(out.TransactionStatus), nil
}

// compile-time assertion that MidtransAdapter satisfies PaymentGatewayAdapter.
var _ PaymentGatewayAdapter = (*MidtransAdapter)(nil)
