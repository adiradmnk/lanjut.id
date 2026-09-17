CREATE TABLE IF NOT EXISTS churn_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES tenants(id),
    member_id VARCHAR(50) NOT NULL REFERENCES members(id),
    churn_probability NUMERIC(5, 4) NOT NULL,
    churn_risk_level VARCHAR(20) NOT NULL,
    detected_pattern VARCHAR(50) NOT NULL,
    root_cause TEXT,
    intervention_trigger VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_churn_history_tenant_id ON churn_history(tenant_id);
CREATE INDEX idx_churn_history_member_id ON churn_history(member_id);
