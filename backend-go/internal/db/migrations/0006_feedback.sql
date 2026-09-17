-- Customer free-text feedback/grievance, translated into structured intent by the AI
-- sidecar's /translate-grievance endpoint (see services/aigateway.go TranslateGrievance).
-- The raw text is always saved even if translation fails/unavailable — a customer's
-- complaint is never lost just because the AI sidecar hiccuped.
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
  member_id VARCHAR(50) NOT NULL REFERENCES members(id),
  raw_text TEXT NOT NULL,
  intent VARCHAR(50),
  category VARCHAR(150),
  preferred_time_of_day VARCHAR(20),
  preferred_days JSONB,
  churn_risk_score NUMERIC(4,3),
  sentiment VARCHAR(50),
  root_cause_summary TEXT,
  recommended_action VARCHAR(100),
  ai_engine_source VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEWED', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_status ON feedback(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_member ON feedback(member_id);
