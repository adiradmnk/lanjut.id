-- Seed historical BNI Virtual Account transactions and payment gateway audit logs
-- Provides realistic transaction history across tenants for Dashboard analytics and AI feature extraction.

-- 1. FitBody Gym (mch-fitbody-01) - Historical BNI VA transactions
INSERT INTO transactions (trx_id, tenant_id, member_id, session_id, session_title, amount, bni_va_number, bni_signature, status, idempotency_key, created_at, paid_at)
VALUES
  ('TRX-FIT-001', 'mch-fitbody-01', 'mbr-budi-02', 'ses-fitbody-malam-kamis', 'Evening Pilates Reformer & De-Stress Flow', 165000, '8241019988220001', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-FIT-001', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '12 minutes'),
  ('TRX-FIT-002', 'mch-fitbody-01', 'mbr-budi-02', 'ses-fitbody-pagi-kamis', 'Morning Reformer Pilates', 150000, '8241019988220002', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-FIT-002', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days' + INTERVAL '5 minutes'),
  ('TRX-FIT-003', 'mch-fitbody-01', 'mbr-budi-02', 'ses-fitbody-malam-jumat', 'Friday Sunset Core & Posture Release', 165000, '8241019988220003', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-FIT-003', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '8 minutes'),
  ('TRX-FIT-004', 'mch-fitbody-01', 'mbr-budi-02', 'ses-fitbody-malam-kamis', 'Evening Pilates Reformer & De-Stress Flow', 165000, '8241019988220004', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-FIT-004', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '4 minutes'),
  ('TRX-FIT-005', 'mch-fitbody-01', 'mbr-dina-01', 'ses-fitbody-pagi-kamis', 'Morning Reformer Pilates', 150000, '8241019988220005', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-FIT-005', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days' + INTERVAL '15 minutes'),
  ('TRX-FIT-006', 'mch-fitbody-01', 'mbr-dina-01', 'ses-fitbody-malam-kamis', 'Evening Pilates Reformer (AI Flex Discount)', 127500, '8241019988220006', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-FIT-006', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days' + INTERVAL '2 minutes'),
  ('TRX-FIT-007', 'mch-fitbody-01', 'mbr-dina-01', 'ses-fitbody-malam-jumat', 'Friday Sunset Core & Posture Release', 165000, '8241019988220007', 'VALIDATED_HMAC_BNI_SNAP', 'PENDING', 'TRX-FIT-007', NOW() - INTERVAL '2 hours', NULL),

-- 2. Zenith Yoga Sanctuary (mch-zenyoga-02)
  ('TRX-ZEN-001', 'mch-zenyoga-02', 'mbr-siti-03', 'ses-zen-vinyasa-pagi', 'Sunrise Vinyasa Flow & Pranayama', 140000, '8242029988330001', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-ZEN-001', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days' + INTERVAL '10 minutes'),
  ('TRX-ZEN-002', 'mch-zenyoga-02', 'mbr-siti-03', 'ses-zen-yin-malam', 'Candlelight Yin Yoga & Sound Bath', 155000, '8242029988330002', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-ZEN-002', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days' + INTERVAL '6 minutes'),
  ('TRX-ZEN-003', 'mch-zenyoga-02', 'mbr-siti-03', 'ses-zen-vinyasa-pagi', 'Sunrise Vinyasa Flow & Pranayama', 140000, '8242029988330003', 'VALIDATED_HMAC_BNI_SNAP', 'PENDING', 'TRX-ZEN-003', NOW() - INTERVAL '1 day', NULL),

-- 3. Surabaya Iron CrossFit (mch-ironcrossfit-03)
  ('TRX-CROSS-001', 'mch-ironcrossfit-03', 'mbr-kevin-04', 'ses-cross-wod-pagi', 'Olympic Weightlifting & Hero WOD', 175000, '8243039988440001', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-CROSS-001', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '3 minutes'),
  ('TRX-CROSS-002', 'mch-ironcrossfit-03', 'mbr-kevin-04', 'ses-cross-wod-malam', 'Endurance Metcon Night Ops', 175000, '8243039988440002', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-CROSS-002', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days' + INTERVAL '9 minutes'),
  ('TRX-CROSS-003', 'mch-ironcrossfit-03', 'mbr-kevin-04', 'ses-cross-wod-pagi', 'Olympic Weightlifting & Hero WOD', 175000, '8243039988440003', 'VALIDATED_HMAC_BNI_SNAP', 'PENDING', 'TRX-CROSS-003', NOW() - INTERVAL '4 hours', NULL),

-- 4. Bandung Core Pilates Studio (mch-bandungpilates-04 - Cold-Start)
  ('TRX-BDG-001', 'mch-bandungpilates-04', 'mbr-anisa-05', 'ses-bdg-reformer-basic', 'Basic Cadillac Reformer Intro', 130000, '8244049988550001', 'VALIDATED_HMAC_BNI_SNAP', 'PAID', 'TRX-BDG-001', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '7 minutes')
ON CONFLICT (trx_id) DO NOTHING;

-- 2. Audit Trail: Payment Gateway Logs (FASE 1b)
INSERT INTO payment_gateway_logs (transaction_id, provider, direction, raw_payload, created_at)
VALUES
  ('TRX-FIT-001', 'BNI', 'REQUEST', '{"virtualAccountNo": "8241019988220001", "billingAmount": "165000", "companyCode": "8241", "headers": {"bnidirect-api-key": "[REDACTED]", "x-signature": "[REDACTED]"}}', NOW() - INTERVAL '28 days'),
  ('TRX-FIT-001', 'BNI', 'RESPONSE', '{"status": "SUCCESS", "trx_id": "TRX-FIT-001", "va_number": "8241019988220001", "amount": 165000, "signature": "[REDACTED]"}', NOW() - INTERVAL '28 days'),
  ('TRX-FIT-001', 'BNI', 'WEBHOOK', '{"trx_id": "TRX-FIT-001", "va_number": "8241019988220001", "amount": 165000, "status": "00"}', NOW() - INTERVAL '28 days' + INTERVAL '12 minutes'),

  ('TRX-FIT-007', 'BNI', 'REQUEST', '{"virtualAccountNo": "8241019988220007", "billingAmount": "165000", "companyCode": "8241", "headers": {"bnidirect-api-key": "[REDACTED]", "x-signature": "[REDACTED]"}}', NOW() - INTERVAL '2 hours'),
  ('TRX-FIT-007', 'BNI', 'RESPONSE', '{"status": "SUCCESS", "trx_id": "TRX-FIT-007", "va_number": "8241019988220007", "amount": 165000, "signature": "[REDACTED]"}', NOW() - INTERVAL '2 hours'),

  ('TRX-ZEN-001', 'BNI', 'REQUEST', '{"virtualAccountNo": "8242029988330001", "billingAmount": "140000", "companyCode": "8242", "headers": {"bnidirect-api-key": "[REDACTED]", "x-signature": "[REDACTED]"}}', NOW() - INTERVAL '35 days'),
  ('TRX-ZEN-001', 'BNI', 'RESPONSE', '{"status": "SUCCESS", "trx_id": "TRX-ZEN-001", "va_number": "8242029988330001", "amount": 140000, "signature": "[REDACTED]"}', NOW() - INTERVAL '35 days'),
  ('TRX-ZEN-001', 'BNI', 'WEBHOOK', '{"trx_id": "TRX-ZEN-001", "va_number": "8242029988330001", "amount": 140000, "status": "00"}', NOW() - INTERVAL '35 days' + INTERVAL '10 minutes'),

  ('TRX-CROSS-001', 'BNI', 'REQUEST', '{"virtualAccountNo": "8243039988440001", "billingAmount": "175000", "companyCode": "8243", "headers": {"bnidirect-api-key": "[REDACTED]", "x-signature": "[REDACTED]"}}', NOW() - INTERVAL '30 days'),
  ('TRX-CROSS-001', 'BNI', 'RESPONSE', '{"status": "SUCCESS", "trx_id": "TRX-CROSS-001", "va_number": "8243039988440001", "amount": 175000, "signature": "[REDACTED]"}', NOW() - INTERVAL '30 days'),
  ('TRX-CROSS-001', 'BNI', 'WEBHOOK', '{"trx_id": "TRX-CROSS-001", "va_number": "8243039988440001", "amount": 175000, "status": "00"}', NOW() - INTERVAL '30 days' + INTERVAL '3 minutes');

-- 3. Invoices for settled transactions
INSERT INTO invoices (invoice_number, trx_id, tenant_id, member_id, item_title, amount_idr, customer_name, customer_email, merchant_name, bni_va_number, issued_at, paid_at)
VALUES
  ('INV-2026-FIT-001', 'TRX-FIT-001', 'mch-fitbody-01', 'mbr-budi-02', 'Evening Pilates Reformer & De-Stress Flow', 165000, 'Budi Santoso', 'budi.santoso@example.com', 'FitBody Gym & Functional Movement', '8241019988220001', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days' + INTERVAL '12 minutes'),
  ('INV-2026-FIT-002', 'TRX-FIT-002', 'mch-fitbody-01', 'mbr-budi-02', 'Morning Reformer Pilates', 150000, 'Budi Santoso', 'budi.santoso@example.com', 'FitBody Gym & Functional Movement', '8241019988220002', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days' + INTERVAL '5 minutes'),
  ('INV-2026-FIT-005', 'TRX-FIT-005', 'mch-fitbody-01', 'mbr-dina-01', 'Morning Reformer Pilates', 150000, 'Dina Kusuma', 'dina.kusuma@example.com', 'FitBody Gym & Functional Movement', '8241019988220005', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days' + INTERVAL '15 minutes'),
  ('INV-2026-ZEN-001', 'TRX-ZEN-001', 'mch-zenyoga-02', 'mbr-siti-03', 'Sunrise Vinyasa Flow & Pranayama', 140000, 'Siti Rahma', 'siti.rahma@example.com', 'Zenith Yoga Sanctuary & Mindfulness', '8242029988330001', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days' + INTERVAL '10 minutes'),
  ('INV-2026-CROSS-001', 'TRX-CROSS-001', 'mch-ironcrossfit-03', 'mbr-kevin-04', 'Olympic Weightlifting & Hero WOD', 175000, 'Kevin Tan', 'kevin.tan@example.com', 'Surabaya Iron CrossFit Box', '8243039988440001', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '3 minutes')
ON CONFLICT (trx_id) DO NOTHING;
