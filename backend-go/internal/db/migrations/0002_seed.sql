INSERT INTO tenants (id, business_name, category, bni_account_number, bni_company_code, bni_va_prefix,
  loan_plafond_idr, monthly_installment_idr, loan_tenor_months,
  max_discount_pct, min_margin_floor_idr, min_slot_fill_ratio_target, auto_intervention_threshold_days)
VALUES
  ('mch-fitbody-01', 'FitBody Gym & Functional Movement', 'Fitness & Wellness', '0129883492', '8241', '824101',
    350000000, 14200000, 36, 15.0, 50000, 70, 21),
  ('mch-zenyoga-02', 'Zenith Yoga Sanctuary & Mindfulness', 'Boutique Yoga Studio', '0348712948', '8242', '824202',
    180000000, 7800000, 24, 20.0, 60000, 65, 14),
  ('mch-ironcrossfit-03', 'Surabaya Iron CrossFit Box', 'High-Intensity Strength & Conditioning', '0991283741', '8243', '824303',
    500000000, 21500000, 48, 10.0, 75000, 80, 25),
  ('mch-bandungpilates-04', 'Bandung Core Pilates Studio (Cold-Start)', 'Pilates Reformer Boutique', '0552391024', '8244', '824404',
    120000000, 5100000, 24, 25.0, 45000, 60, 14)
ON CONFLICT (id) DO NOTHING;

INSERT INTO class_sessions (id, tenant_id, title, day_of_week, time_slot, time_of_day, instructor, total_capacity, booked_slots, price_per_session_idr)
VALUES
  ('ses-fitbody-pagi-kamis', 'mch-fitbody-01', 'Morning Reformer Pilates', 'Kamis', '08:00 - 09:00 WIB', 'MORNING', 'Coach Sarah', 10, 9, 150000),
  ('ses-fitbody-malam-kamis', 'mch-fitbody-01', 'Evening Pilates Reformer & De-Stress Flow', 'Kamis', '19:00 - 20:00 WIB', 'EVENING', 'Coach Maya', 10, 6, 165000),
  ('ses-fitbody-malam-jumat', 'mch-fitbody-01', 'Friday Sunset Core & Posture Release', 'Jumat', '19:00 - 20:00 WIB', 'EVENING', 'Coach Dimas', 12, 7, 165000),
  ('ses-zen-vinyasa-pagi', 'mch-zenyoga-02', 'Sunrise Vinyasa Flow & Pranayama', 'Rabu', '07:00 - 08:15 WIB', 'MORNING', 'Master Anand', 15, 14, 140000),
  ('ses-zen-yin-malam', 'mch-zenyoga-02', 'Candlelight Yin Yoga & Sound Bath', 'Kamis', '19:30 - 20:45 WIB', 'EVENING', 'Guru Devi', 15, 9, 155000),
  ('ses-cross-wod-pagi', 'mch-ironcrossfit-03', 'Olympic Weightlifting & Hero WOD', 'Selasa', '06:30 - 07:30 WIB', 'MORNING', 'Coach Anton', 20, 19, 175000),
  ('ses-cross-wod-malam', 'mch-ironcrossfit-03', 'Endurance Metcon Night Ops', 'Kamis', '19:00 - 20:00 WIB', 'EVENING', 'Coach Anton', 20, 12, 175000),
  ('ses-bdg-reformer-basic', 'mch-bandungpilates-04', 'Basic Cadillac Reformer Intro', 'Senin', '10:00 - 11:00 WIB', 'MORNING', 'Coach Nadia', 8, 2, 130000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO members (id, tenant_id, name, email, phone, current_package, package_tier, active_until, total_quota, used_quota, joined_at, churn_risk_flag)
VALUES
  ('mbr-dina-01', 'mch-fitbody-01', 'Dina Kusuma', 'dina.kusuma@example.com', '081298765432', 'Monthly Morning Pilates (Jadwal 08.00 WIB)', 'UNLIMITED', CURRENT_DATE + 7, 8, 2, '2026-06-01', 'HIGH'),
  ('mbr-budi-02', 'mch-fitbody-01', 'Budi Santoso', 'budi.santoso@example.com', '081211223344', 'All-Access Strength & Core Tier', 'PRO', CURRENT_DATE + 25, 12, 10, '2026-05-15', 'LOW'),
  ('mbr-siti-03', 'mch-zenyoga-02', 'Siti Rahma', 'siti.rahma@example.com', '081399887766', 'Zen Morning Vinyasa Unlimited', 'UNLIMITED', CURRENT_DATE + 6, 10, 3, '2026-07-01', 'HIGH'),
  ('mbr-kevin-04', 'mch-ironcrossfit-03', 'Kevin Tan', 'kevin.tan@example.com', '081755443322', 'Morning WOD Dedicated Pass', 'PRO', CURRENT_DATE + 5, 12, 4, '2026-06-10', 'HIGH'),
  ('mbr-anisa-05', 'mch-bandungpilates-04', 'Anisa Putri', 'anisa.putri@example.com', '081922334455', 'Reformer Intro 4-Sessions', 'BASIC', CURRENT_DATE + 28, 4, 1, CURRENT_DATE - 3, 'LOW')
ON CONFLICT (id) DO NOTHING;
