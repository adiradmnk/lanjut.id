-- FASE 1: multi-provider payment gateway support. Existing tenants/transactions default to
-- 'BNI' so current behavior is unchanged for every row that already exists.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20) NOT NULL DEFAULT 'BNI'
  CHECK (payment_provider IN ('BNI', 'MIDTRANS', 'SIMULATOR'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_partner_id VARCHAR(50);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_metadata JSONB;
