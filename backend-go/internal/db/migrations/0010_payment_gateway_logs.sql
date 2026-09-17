-- FASE 1b: raw request/response/webhook audit trail per payment gateway call. Additive
-- only — nothing about the existing checkout/webhook flow or response shape changes because
-- this table exists; it's just an extra INSERT at three points (see payments.go).
--
-- Hard rule: signature/api-key values are NEVER written here in their real form. Redaction
-- happens at the point of writing (inside the adapter that builds the payload — see
-- bnipayment.go/midtrans.go), not at the point of reading.
CREATE TABLE IF NOT EXISTS payment_gateway_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100), -- loose reference to transactions.trx_id; no FK constraint
  -- (a log write must never fail/roll back just because the transaction row doesn't exist
  -- yet, e.g. a REQUEST log written before CreatePendingTransaction has run).
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('BNI', 'MIDTRANS', 'SIMULATOR')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('REQUEST', 'RESPONSE', 'WEBHOOK')),
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_transaction ON payment_gateway_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_logs_provider_direction_created
  ON payment_gateway_logs(provider, direction, created_at);
