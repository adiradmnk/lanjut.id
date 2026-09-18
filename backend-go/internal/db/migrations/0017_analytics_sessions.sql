-- Merchant Analytics Query Agent: a Claude-Code-style side-panel chat where a merchant
-- owner asks a free-text question ("berikan saya analisis satu minggu terakhir") and gets
-- back an AI-generated markdown report grounded in their own real transaction + feedback
-- data (services.AIGateway.GenerateAnalyticsReport -> ai/app/features/analytics). Each
-- question/answer pair is stored as two rows (role 'user' / 'assistant') under a session,
-- so the sidebar can list past sessions and a session can be reopened with full history.
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL DEFAULT 'Analisis Baru',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_tenant ON analytics_sessions(tenant_id);

CREATE TABLE IF NOT EXISTS analytics_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_messages_session ON analytics_messages(session_id);
