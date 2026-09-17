-- Seed lanjut.id official staff & partner demo accounts
INSERT INTO accounts (email, password_hash, role, tenant_id, name)
VALUES
  ('merchant@lanjut.id', crypt('demo1234', gen_salt('bf')), 'merchant', 'mch-fitbody-01', 'FitBody Merchant Staff'),
  ('partner@lanjut.id', crypt('demo1234', gen_salt('bf')), 'partner', NULL, 'BNI Payment Partner')
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, tenant_id = EXCLUDED.tenant_id, name = EXCLUDED.name;
