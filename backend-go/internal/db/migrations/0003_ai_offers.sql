-- Merchant product catalog ("guidebook"). Generic across merchant verticals (gym, cafe,
-- catering, kos/property, etc.) — quota_sessions/duration_days are interpreted per-vertical
-- by the merchant (e.g. sessions for a gym, delivery slots for catering, nights for a kos).
CREATE TABLE IF NOT EXISTS product_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price_idr NUMERIC(18,2) NOT NULL,
  quota_sessions INT NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 0,
  billing_type VARCHAR(20) NOT NULL CHECK (billing_type IN ('SUBSCRIPTION','ONE_TIME')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_packages_tenant ON product_packages(tenant_id);

-- Candidate offers (from the catalog, or AI-generated beyond it) gated behind mandatory
-- human approval. AI can never transition a row past AI_SUGGESTED on its own — only the
-- merchant-approval handlers may do that.
CREATE TABLE IF NOT EXISTS ai_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  source VARCHAR(20) NOT NULL CHECK (source IN ('CATALOG','AI_GENERATED')),
  based_on_package_id UUID REFERENCES product_packages(id),
  target_session_id VARCHAR(50) REFERENCES class_sessions(id),
  proposed_title VARCHAR(200) NOT NULL,
  terms_snapshot JSONB,
  price_idr NUMERIC(18,2) NOT NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  projected_margin_idr NUMERIC(18,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'AI_SUGGESTED' CHECK (status IN
    ('AI_SUGGESTED','MERCHANT_APPROVED','MERCHANT_REJECTED','SENT_TO_CUSTOMER','ACCEPTED','REJECTED_BY_CUSTOMER','EXPIRED')),
  rejection_reason TEXT,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_offers_tenant_status ON ai_offers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_offers_member ON ai_offers(member_id);

-- Soft holds on a session slot while an offer is awaiting/holding approval, so two
-- concurrent generate-offers calls can't both grab the last seat. Lazily expired (no cron):
-- any HELD row past held_until is treated as free the next time capacity is checked.
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_offer_id UUID REFERENCES ai_offers(id),
  session_id VARCHAR(50) NOT NULL REFERENCES class_sessions(id),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  status VARCHAR(20) NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD','CONFIRMED','RELEASED','EXPIRED')),
  held_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservations_session_status ON reservations(session_id, status);

-- Links a settled transaction back to the offer (and its locked terms_snapshot) it came
-- from, when the purchase originated from an approved ai_offer rather than a direct
-- checkout. class_sessions.booked_slots stays the single source of truth for capacity:
-- the reservation is released back at webhook-settle time (see SettleTransaction).
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ai_offer_id UUID REFERENCES ai_offers(id);
