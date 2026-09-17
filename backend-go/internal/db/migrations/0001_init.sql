CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(50) PRIMARY KEY,
  business_name VARCHAR(150) NOT NULL,
  category VARCHAR(80),
  bni_account_number VARCHAR(30),
  bni_company_code VARCHAR(20),
  bni_va_prefix VARCHAR(10),
  loan_plafond_idr NUMERIC(18,2) NOT NULL DEFAULT 0,
  monthly_installment_idr NUMERIC(18,2) NOT NULL DEFAULT 0,
  loan_tenor_months INT NOT NULL DEFAULT 0,
  max_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 15,
  min_margin_floor_idr NUMERIC(18,2) NOT NULL DEFAULT 50000,
  min_slot_fill_ratio_target NUMERIC(5,2) NOT NULL DEFAULT 70,
  auto_intervention_threshold_days INT NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  current_package VARCHAR(150),
  package_tier VARCHAR(20) NOT NULL DEFAULT 'BASIC',
  active_until DATE,
  total_quota INT NOT NULL DEFAULT 0,
  used_quota INT NOT NULL DEFAULT 0,
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  churn_risk_flag VARCHAR(10) NOT NULL DEFAULT 'LOW'
);
CREATE INDEX IF NOT EXISTS idx_members_tenant ON members(tenant_id);

CREATE TABLE IF NOT EXISTS class_sessions (
  id VARCHAR(50) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  title VARCHAR(120) NOT NULL,
  day_of_week VARCHAR(10),
  time_slot VARCHAR(30),
  time_of_day VARCHAR(10) NOT NULL DEFAULT 'MORNING',
  instructor VARCHAR(80),
  total_capacity INT NOT NULL DEFAULT 0,
  booked_slots INT NOT NULL DEFAULT 0,
  price_per_session_idr NUMERIC(18,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON class_sessions(tenant_id, time_of_day);

CREATE TABLE IF NOT EXISTS magic_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  trx_id VARCHAR(100) PRIMARY KEY,
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  session_id VARCHAR(50), -- may reference class_sessions(id), or a synthetic id (e.g. flex/freeze offers) not backed by a real session row
  session_title VARCHAR(150),
  amount NUMERIC(18,2) NOT NULL,
  bni_va_number VARCHAR(30) NOT NULL,
  bni_signature VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id, status);

CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL
);
