-- Staff login accounts (merchant dashboard staff, BNI relationship manager/"partner"
-- portal). Deliberately minimal — no granular per-permission RBAC, just email+password+role,
-- gated behind a mandatory OTP second factor sent via email (Mailjet).
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('merchant', 'partner')),
  tenant_id VARCHAR(50) REFERENCES tenants(id), -- required for role=merchant, null for role=partner
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One-time passwords for the second login factor. A row is consumed at most once
-- (consumed_at set) and has a short expiry; attempt_count caps brute-force guesses within
-- that window. Lazily expired at verify time — no cron job needed.
CREATE TABLE IF NOT EXISTS login_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_otps_account ON login_otps(account_id, consumed_at);

-- Issued after a successful OTP verification. token_hash is a SHA-256 of the bearer token
-- handed to the client — same "never store the raw secret" pattern as magic_tokens.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
