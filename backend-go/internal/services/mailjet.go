package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"lanjut/backend/internal/config"
)

// MailjetService sends transactional email via Mailjet's REST API v3.1. Nil-safe like
// R2Storage: if credentials aren't configured, NewMailjetService returns nil and the login
// handler reports a clear 503 rather than the server failing to start.
type MailjetService struct {
	apiKey    string
	apiSecret string
	fromEmail string
	fromName  string
	client    *http.Client
}

// NewMailjetService returns nil (not an error) if Mailjet credentials aren't configured, so
// OTP login is an optional feature rather than a hard startup dependency — mirrors R2Storage.
func NewMailjetService(cfg config.Config) *MailjetService {
	if cfg.MailjetAPIKey == "" || cfg.MailjetAPISecret == "" {
		return nil
	}
	return &MailjetService{
		apiKey:    cfg.MailjetAPIKey,
		apiSecret: cfg.MailjetAPISecret,
		fromEmail: cfg.MailjetFromEmail,
		fromName:  cfg.MailjetFromName,
		client:    &http.Client{Timeout: 10 * time.Second},
	}
}

type mailjetRecipient struct {
	Email string `json:"Email"`
	Name  string `json:"Name,omitempty"`
}

type mailjetMessage struct {
	From     mailjetRecipient   `json:"From"`
	To       []mailjetRecipient `json:"To"`
	Subject  string             `json:"Subject"`
	TextPart string             `json:"TextPart"`
	HTMLPart string             `json:"HTMLPart"`
}

type mailjetSendRequest struct {
	Messages []mailjetMessage `json:"Messages"`
}

// SendLoginOTP emails a one-time login code. otp is plain 6-digit text — never logged or
// returned in any API response, only ever sent here.
func (m *MailjetService) SendLoginOTP(ctx context.Context, toEmail, toName, otp string) error {
	reqBody := mailjetSendRequest{
		Messages: []mailjetMessage{
			{
				From:    mailjetRecipient{Email: m.fromEmail, Name: m.fromName},
				To:      []mailjetRecipient{{Email: toEmail, Name: toName}},
				Subject: "Kode OTP Login LANJUT",
				TextPart: fmt.Sprintf(
					"Halo %s,\n\nKode OTP login kamu: %s\n\nBerlaku 5 menit. Jangan bagikan kode ini ke siapa pun.\n\n— LANJUT",
					toName, otp),
				HTMLPart: fmt.Sprintf(
					`<p>Halo %s,</p><p>Kode OTP login kamu:</p><h2 style="letter-spacing:4px">%s</h2><p>Berlaku 5 menit. Jangan bagikan kode ini ke siapa pun.</p><p>&mdash; LANJUT</p>`,
					toName, otp),
			},
		},
	}

	bodyJSON, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("marshal mailjet request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.mailjet.com/v3.1/send", bytes.NewReader(bodyJSON))
	if err != nil {
		return fmt.Errorf("build mailjet request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(m.apiKey, m.apiSecret)

	resp, err := m.client.Do(req)
	if err != nil {
		return fmt.Errorf("mailjet unreachable: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("mailjet returned status %d", resp.StatusCode)
	}
	return nil
}
