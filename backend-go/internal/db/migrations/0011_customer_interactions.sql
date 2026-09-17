-- FASE 3: customer-side interactions (cancel, feedback, reminders, human escalation).
--
-- ASUMSI: the schema has no standalone "subscription" entity — a member row itself IS the
-- subscription (active_until/total_quota/used_quota already live on members). So
-- /api/member/subscription/:id/cancel and .../feedback treat :id as a member_id, and
-- subscription_status below lives on members rather than a separate table. Easy to split
-- out later if a real multi-subscription-per-member model is ever needed.
ALTER TABLE members ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
  CHECK (subscription_status IN ('ACTIVE', 'CANCELLED'));
ALTER TABLE members ADD COLUMN IF NOT EXISTS contact_opt_out BOOLEAN NOT NULL DEFAULT false;

-- Free-text feedback tied to a specific context (a cancellation, a failed payment, a
-- periodic "how's it going" pulse check). context_ref_id is NOT NULL DEFAULT '' (rather
-- than nullable) specifically so the UNIQUE constraint below reliably dedupes double-submits
-- even when there's no natural ref id to attach (e.g. a generic PULSE_CHECK) — Postgres
-- treats every NULL as distinct, which would silently defeat dedup if this were nullable.
CREATE TABLE IF NOT EXISTS member_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  context_type VARCHAR(20) NOT NULL CHECK (context_type IN ('CANCELLATION', 'PAYMENT_FAILURE', 'PULSE_CHECK')),
  context_ref_id VARCHAR(100) NOT NULL DEFAULT '',
  reason_code VARCHAR(50),
  free_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, context_type, context_ref_id)
);

-- One row per reminder attempt actually sent for a still-unpaid transaction. attempt_number
-- is capped at 3 by the batch job (store.go RunPaymentReminderBatch), never by a DB
-- constraint, so the cap can change without a migration.
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) NOT NULL REFERENCES transactions(trx_id),
  attempt_number INT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, attempt_number)
);

-- One row per (member, purpose, day) — the single source of truth for "have we already
-- contacted this member today for this reason", via INSERT ... ON CONFLICT DO NOTHING
-- RETURNING id (see store.CanContact). Never check-then-insert as two separate steps.
CREATE TABLE IF NOT EXISTS customer_contact_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  purpose VARCHAR(50) NOT NULL,
  date_bucket DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, purpose, date_bucket)
);

-- At most one OPEN ticket per (member, tenant) at a time, enforced by the partial unique
-- index below rather than application logic — request-human-help relies on this via
-- INSERT ... ON CONFLICT (member_id, tenant_id) WHERE status = 'OPEN' DO NOTHING.
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  issue TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_one_open_per_member_tenant
  ON support_tickets(member_id, tenant_id) WHERE status = 'OPEN';
