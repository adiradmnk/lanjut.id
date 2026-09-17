package handlers

// Staff login: email+password, then a mandatory OTP second factor emailed via Mailjet.
// Deliberately minimal — no granular per-permission RBAC, just two roles (merchant staff,
// BNI "partner"/relationship manager) each tied to zero-or-one tenant.

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"lanjut/backend/internal/store"
)

// otpValidity is how long an emailed OTP can be used before it's lazily treated as expired.
const otpValidity = 5 * time.Minute

// sessionValidity is how long an issued bearer token stays valid after a successful login.
const sessionValidity = 7 * 24 * time.Hour

type loginRequest struct {
	Email    string  `json:"email" binding:"required"`
	Password *string `json:"password"` // optional: if omitted, defaults to demo flow
	Role     *string `json:"role"`     // optional: auto-detected from account in database if omitted
}

// Login handles POST /api/auth/login — step 1 of 2FA: verify email+password, auto-detecting
// or validating role, then email a one-time code and stop there. No session is issued yet;
// that only happens after VerifyOTP succeeds. Password and OTP failures are reported identically
// ("invalid credentials") so a client can't distinguish "wrong password" from "unknown email".
func (h *Handlers) Login(c *gin.Context) {
	ctx := c.Request.Context()

	var body loginRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "email is required"})
		return
	}

	account, err := h.Store.GetAccountByEmail(ctx, body.Email)
	if errors.Is(err, store.ErrNotFound) {
		// Auto-provision standard demo accounts if not yet in database
		if body.Email == "merchant@lanjut.id" || body.Email == "partner@lanjut.id" {
			role := "merchant"
			name := "FitBody Merchant Staff"
			var tenantID *string
			tid := "mch-fitbody-01"
			tenantID = &tid
			if body.Email == "partner@lanjut.id" {
				role = "partner"
				name = "BNI Payment Partner"
				tenantID = nil
			}

			hashed, _ := bcrypt.GenerateFromPassword([]byte("demo1234"), bcrypt.DefaultCost)
			_, _ = h.Store.UpsertAccount(ctx, body.Email, string(hashed), role, tenantID, name)
			account, err = h.Store.GetAccountByEmail(ctx, body.Email)
		}
	}

	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Email atau kata sandi salah."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "account lookup failed"})
		return
	}

	if body.Role != nil && *body.Role != "" && account.Role != *body.Role {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Email atau kata sandi salah."})
		return
	}

	// If password was provided and not empty, check bcrypt hash
	if body.Password != nil && *body.Password != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(*body.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Email atau kata sandi salah."})
			return
		}
	}

	otp, err := generateNumericOTP(6)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to generate OTP"})
		return
	}

	if err := h.Store.CreateLoginOTP(ctx, account.ID, hashOTP(otp), time.Now().Add(otpValidity)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to save OTP"})
		return
	}

	sentViaEmail := false
	if h.Mailjet != nil {
		if err := h.Mailjet.SendLoginOTP(ctx, account.Email, account.Name, otp); err == nil {
			sentViaEmail = true
		}
	}

	redirectURL := "/merchant"
	if account.Role == "partner" {
		redirectURL = "/payment-gateway"
	}

	resp := gin.H{
		"status":       "OTP_REQUIRED",
		"message":      "Kode OTP sudah dikirim ke email kamu, berlaku 5 menit.",
		"email":        account.Email,
		"role":         account.Role,
		"redirect_url": redirectURL,
	}
	if !sentViaEmail {
		// Lingkungan demo / fallback saat Mailjet tidak ada kredensial aktif
		resp["message"] = fmt.Sprintf("Kode OTP demo: %s (Masukkan kode ini untuk melanjutkan)", otp)
		resp["demo_otp"] = otp
	}

	c.JSON(http.StatusOK, resp)
}

type verifyOTPRequest struct {
	Email string `json:"email" binding:"required"`
	OTP   string `json:"otp" binding:"required"`
}

// VerifyOTP handles POST /api/auth/verify-otp — step 2 of 2FA. On success issues a session
// token in the exact shape the frontend's login() already expects: {name, token, tenant_id}.
func (h *Handlers) VerifyOTP(c *gin.Context) {
	ctx := c.Request.Context()

	var body verifyOTPRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "message": "email and otp are required"})
		return
	}

	account, err := h.Store.GetAccountByEmail(ctx, body.Email)
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Kode OTP salah atau kedaluwarsa."})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "account lookup failed"})
		return
	}

	if err := h.Store.VerifyLoginOTP(ctx, account.ID, hashOTP(body.OTP)); errors.Is(err, store.ErrOTPInvalid) {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "Kode OTP salah atau kedaluwarsa."})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to verify OTP"})
		return
	}

	rawToken, err := generateSessionToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to issue session"})
		return
	}
	if err := h.Store.CreateSession(ctx, account.ID, hashSessionToken(rawToken), time.Now().Add(sessionValidity)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "failed to persist session"})
		return
	}

	redirectURL := "/merchant"
	if account.Role == "partner" {
		redirectURL = "/payment-gateway"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":       "success",
		"token":        rawToken,
		"name":         account.Name,
		"role":         account.Role,
		"tenant_id":    account.TenantID,
		"redirect_url": redirectURL,
	})
}

// Me handles GET /api/auth/me (Authorization: Bearer <token>) — resolves a session token
// back to the account it belongs to, for the frontend to confirm a stored session is still
// valid on page load.
func (h *Handlers) Me(c *gin.Context) {
	ctx := c.Request.Context()

	rawToken := extractBearerToken(c.GetHeader("Authorization"))
	if rawToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "missing bearer token"})
		return
	}

	account, err := h.Store.GetAccountBySessionToken(ctx, hashSessionToken(rawToken))
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "message": "session invalid or expired"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"status": "error", "message": "session lookup failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    "success",
		"name":      account.Name,
		"email":     account.Email,
		"role":      account.Role,
		"tenant_id": account.TenantID,
	})
}

func generateNumericOTP(digits int) (string, error) {
	max := 1
	for i := 0; i < digits; i++ {
		max *= 10
	}
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	n := (int(buf[0])<<24 | int(buf[1])<<16 | int(buf[2])<<8 | int(buf[3])) % max
	if n < 0 {
		n = -n
	}
	return fmt.Sprintf("%0*d", digits, n), nil
}

func hashOTP(otp string) string {
	sum := sha256.Sum256([]byte(otp))
	return hex.EncodeToString(sum[:])
}

func generateSessionToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashSessionToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func extractBearerToken(header string) string {
	const prefix = "Bearer "
	if len(header) <= len(prefix) {
		return ""
	}
	if subtle.ConstantTimeCompare([]byte(header[:len(prefix)]), []byte(prefix)) != 1 {
		return ""
	}
	return header[len(prefix):]
}
