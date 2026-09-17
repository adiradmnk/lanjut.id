-- Demo login accounts matching frontend/src/app/login/{merchant,partner}/page.tsx's
-- "Isi kredensial demo" button (owner@fitbody.id / rm@bni.co.id, password "demo1234").
-- pgcrypto's crypt()+gen_salt('bf') produces a standard bcrypt hash, compatible with Go's
-- golang.org/x/crypto/bcrypt.CompareHashAndPassword on the verify side.
INSERT INTO accounts (email, password_hash, role, tenant_id, name)
VALUES
  ('owner@fitbody.id', crypt('demo1234', gen_salt('bf')), 'merchant', 'mch-fitbody-01', 'Owner FitBody Gym'),
  ('rm@bni.co.id', crypt('demo1234', gen_salt('bf')), 'partner', NULL, 'RM BNI Ventures')
ON CONFLICT (email) DO NOTHING;
