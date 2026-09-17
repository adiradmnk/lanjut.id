-- Migration: 0003_merchant_guidebooks_and_rules.sql
-- Description: Adds merchant_guidebooks table for business rule ingestion from payment gateway / BNI onboarding

CREATE TABLE IF NOT EXISTS merchant_guidebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL DEFAULT 'application/pdf',
  raw_text TEXT,
  extracted_rules JSONB,
  status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guidebooks_tenant ON merchant_guidebooks(tenant_id, status);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_guidebook_id UUID;
