-- Dummy "Rukita" (kos & apartment bulanan) merchant tenant, seeded for the end-to-end
-- demo: a co-living/kos operator on the same generic tenant/member/transaction schema as
-- the gym merchants above. Nothing here is a special-cased data model — the Rukita frontend
-- just relabels "package" as "kamar" and calls the same real cancel/feedback/AI endpoints.

INSERT INTO tenants (id, business_name, category, bni_account_number, bni_company_code, bni_va_prefix,
  loan_plafond_idr, monthly_installment_idr, loan_tenor_months,
  max_discount_pct, min_margin_floor_idr, min_slot_fill_ratio_target, auto_intervention_threshold_days)
VALUES
  ('mch-rukita-01', 'Rukita Living - Kos & Apartemen Bulanan', 'Kos & Apartemen Bulanan', '0187734921', '8250', '825001',
    750000000, 28500000, 36, 12.0, 350000, 85, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, tenant_id, name, email, phone, current_package, package_tier, active_until, total_quota, used_quota, joined_at, churn_risk_flag)
VALUES
  ('mbr-rk-melati-01', 'mch-rukita-01', 'Melati Anggraini', 'melati.anggraini@example.com', '081311122233', 'Kamar Deluxe AC - Rukita Kemang Aster', 'PRO', CURRENT_DATE + 9, 12, 9, '2026-01-10', 'HIGH'),
  ('mbr-rk-fajar-02', 'mch-rukita-01', 'Fajar Nugroho', 'fajar.nugroho@example.com', '081322233344', 'Kamar Standard - Rukita Tebet Melati', 'BASIC', CURRENT_DATE + 20, 12, 5, '2026-03-01', 'MEDIUM'),
  ('mbr-rk-clara-03', 'mch-rukita-01', 'Clara Wijayanti', 'clara.wijayanti@example.com', '081333344455', 'Kamar Suite Balcony - Rukita Bintaro Anggrek', 'UNLIMITED', CURRENT_DATE + 4, 12, 11, '2025-11-15', 'HIGH'),
  ('mbr-rk-yusuf-04', 'mch-rukita-01', 'Yusuf Pratama', 'yusuf.pratama@example.com', '081344455566', 'Kamar Standard - Rukita Kemang Aster', 'BASIC', CURRENT_DATE + 27, 12, 2, '2026-06-05', 'LOW')
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (trx_id, tenant_id, member_id, session_id, session_title, amount, bni_va_number, status, idempotency_key, created_at, paid_at)
VALUES
  ('trx-rk-001', 'mch-rukita-01', 'mbr-rk-melati-01', NULL, 'Sewa Bulanan - Kamar Deluxe AC (Kemang Aster)', 2450000, '8250011000000001', 'PAID', 'idem-rk-001', now() - interval '32 days', now() - interval '31 days'),
  ('trx-rk-002', 'mch-rukita-01', 'mbr-rk-melati-01', NULL, 'Sewa Bulanan - Kamar Deluxe AC (Kemang Aster)', 2450000, '8250011000000002', 'PAID', 'idem-rk-002', now() - interval '2 days', now() - interval '1 days'),
  ('trx-rk-003', 'mch-rukita-01', 'mbr-rk-fajar-02', NULL, 'Sewa Bulanan - Kamar Standard (Tebet Melati)', 1650000, '8250011000000003', 'PAID', 'idem-rk-003', now() - interval '20 days', now() - interval '19 days'),
  ('trx-rk-004', 'mch-rukita-01', 'mbr-rk-clara-03', NULL, 'Sewa Bulanan - Kamar Suite Balcony (Bintaro Anggrek)', 3200000, '8250011000000004', 'PENDING', 'idem-rk-004', now() - interval '3 hours', NULL),
  ('trx-rk-005', 'mch-rukita-01', 'mbr-rk-yusuf-04', NULL, 'Sewa Bulanan - Kamar Standard (Kemang Aster)', 1650000, '8250011000000005', 'PAID', 'idem-rk-005', now() - interval '5 days', now() - interval '4 days')
ON CONFLICT (trx_id) DO NOTHING;
