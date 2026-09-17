package config

import "os"

type Config struct {
	Port             string
	DatabaseURL      string
	AIServiceURL     string
	MagicTokenSecret string
	BNIAPIURL        string
	BNIClientID      string
	BNIClientSecret  string
	BNICompanyCode   string
	BNICorporateID   string
	BNIUserID        string
	R2AccountID      string
	R2AccessKeyID    string
	R2SecretKey      string
	R2BucketName     string
	R2PublicBaseURL  string
	MailjetAPIKey    string
	MailjetAPISecret string
	MailjetFromEmail string
	MailjetFromName  string
}

func Load() Config {
	return Config{
		Port:             getEnv("PORT", "5001"),
		DatabaseURL:      getEnv("DATABASE_URL", "postgres://lanjut:lanjut@localhost:5432/lanjut?sslmode=disable"),
		AIServiceURL:     getEnv("AI_SERVICE_URL", "http://localhost:8000"),
		MagicTokenSecret: getEnv("MAGIC_TOKEN_HMAC_SECRET", "lanjut_enterprise_secret_hmac_key_2026_fintech"),
		BNIAPIURL:        getEnv("BNI_API_URL", "https://sandbox.bni.co.id/v1.0"),
		BNIClientID:      getEnv("BNI_CLIENT_ID", ""),
		BNIClientSecret:  getEnv("BNI_CLIENT_SECRET", ""),
		BNICompanyCode:   getEnv("BNI_COMPANY_CODE", "8808"),
		BNICorporateID:   getEnv("BNI_CORPORATE_ID", "FITBODY01"),
		BNIUserID:        getEnv("BNI_USER_ID", "USERLANJUT"),
		R2AccountID:      getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:    getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretKey:      getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2BucketName:     getEnv("R2_BUCKET_NAME", "lanjut-guidebooks"),
		R2PublicBaseURL:  getEnv("R2_PUBLIC_BASE_URL", ""),
		MailjetAPIKey:    getEnv("MAILJET_API_KEY", ""),
		MailjetAPISecret: getEnv("MAILJET_API_SECRET", ""),
		MailjetFromEmail: getEnv("MAILJET_FROM_EMAIL", "no-reply@lanjut.id"),
		MailjetFromName:  getEnv("MAILJET_FROM_NAME", "LANJUT"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
