-- A merchant's uploaded "guidebook" document (full catalog/package/policy/payment detail),
-- stored in R2 (r2_key/r2_url only point at the object there — the file bytes never live
-- in Postgres). extracted_text is what the AI sidecar pulled out of the document (PDF/docx/
-- txt) so it can ground its offer generation on the merchant's actual policies, rather than
-- guessing. Multiple uploads are kept for history; only one is_current=true per tenant at
-- a time, and that's the one used for AI grounding.
CREATE TABLE IF NOT EXISTS guidebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  filename VARCHAR(255) NOT NULL,
  r2_key VARCHAR(500) NOT NULL,
  r2_url VARCHAR(500),
  content_type VARCHAR(100),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  extracted_text TEXT,
  extraction_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (extraction_status IN ('PENDING', 'SUCCESS', 'FAILED')),
  is_current BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guidebooks_tenant_current ON guidebooks(tenant_id, is_current);
