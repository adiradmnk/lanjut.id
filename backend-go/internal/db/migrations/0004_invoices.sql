-- Customer-facing invoice/receipt, issued once a transaction settles (see
-- SettleTransaction / BNIWebhook). One invoice per transaction — trx_id is UNIQUE, so
-- re-generating for an already-invoiced transaction is a no-op rather than a duplicate.
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  trx_id VARCHAR(100) NOT NULL UNIQUE REFERENCES transactions(trx_id),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  ai_offer_id UUID REFERENCES ai_offers(id),
  item_title VARCHAR(200) NOT NULL,
  amount_idr NUMERIC(18,2) NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(150),
  merchant_name VARCHAR(150) NOT NULL,
  bni_va_number VARCHAR(30),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invoices_member ON invoices(member_id);
