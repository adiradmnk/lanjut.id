export interface Merchant {
  id: string;
  name: string;
  category: string;
  bni_account_number: string;
  min_margin_pct: number; // e.g. 20%
  max_discount_pct: number; // e.g. 15%
}

export interface ServiceSession {
  id: string;
  merchant_id: string;
  title: string;
  day_of_week: string; // "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu"
  time_slot: string; // "08:00 - 09:00" or "19:00 - 20:00"
  time_of_day: 'MORNING' | 'AFTERNOON' | 'EVENING';
  instructor: string;
  total_capacity: number;
  booked_slots: number;
  price_per_session_idr: number;
}

export interface MemberProfile {
  id: string;
  merchant_id: string;
  name: string;
  email: string;
  phone: string;
  current_package: string;
  package_tier: 'BASIC' | 'PRO' | 'UNLIMITED';
  active_until: string;
  days_remaining: number;
  total_quota: number;
  used_quota: number;
  attendance_streak_drop: boolean; // true if attended <= 2 out of 8 sessions
  last_attended_date: string;
  churn_risk_flag: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ChangeRequestProposal {
  id: string;
  member_id: string;
  merchant_id: string;
  original_session_time: string;
  target_session_id: string;
  target_session_title: string;
  target_session_time: string;
  price_adjustment_idr: number;
  discount_applied_pct: number;
  margin_protected: boolean;
  status: 'PENDING_APPROVAL' | 'PAID_ACTIVATED' | 'REJECTED';
  bni_va_number: string;
  created_at: string;
}

// ----------------------------------------------------
// Mock Datastore Initialization
// ----------------------------------------------------
export const merchants: Merchant[] = [
  {
    id: 'mch-zen-001',
    name: 'Zenith Pilates & Functional Movement',
    category: 'Boutique Fitness & Wellness Studio',
    bni_account_number: '0823419082',
    min_margin_pct: 25,
    max_discount_pct: 15,
  },
];

export const members: MemberProfile[] = [
  {
    id: 'mbr-dina-01',
    merchant_id: 'mch-zen-001',
    name: 'Dina Kusuma',
    email: 'dina.kusuma@example.com',
    phone: '081298765432',
    current_package: 'Monthly Morning Pilates (Jadwal 08.00 WIB)',
    package_tier: 'UNLIMITED',
    active_until: '2026-09-23',
    days_remaining: 7,
    total_quota: 8,
    used_quota: 2, // Anomali: hanya datang 2x dari 8 jatah
    attendance_streak_drop: true,
    last_attended_date: '2026-09-02',
    churn_risk_flag: 'HIGH',
  },
];

export const serviceSessions: ServiceSession[] = [
  {
    id: 'ses-pagi-kamis',
    merchant_id: 'mch-zen-001',
    title: 'Pilates Reformer Core Foundation',
    day_of_week: 'Kamis',
    time_slot: '08:00 - 09:00 WIB',
    time_of_day: 'MORNING',
    instructor: 'Coach Sarah',
    total_capacity: 10,
    booked_slots: 9,
    price_per_session_idr: 150000,
  },
  {
    id: 'ses-malam-kamis',
    merchant_id: 'mch-zen-001',
    title: 'Evening Pilates Reformer & De-Stress Flow',
    day_of_week: 'Kamis',
    time_slot: '19:00 - 20:00 WIB',
    time_of_day: 'EVENING',
    instructor: 'Coach Maya',
    total_capacity: 10,
    booked_slots: 6, // Masih ada 4 kursi kosong!
    price_per_session_idr: 165000,
  },
  {
    id: 'ses-malam-jumat',
    merchant_id: 'mch-zen-001',
    title: 'Friday Sunset Spine & Posture Release',
    day_of_week: 'Jumat',
    time_slot: '19:00 - 20:00 WIB',
    time_of_day: 'EVENING',
    instructor: 'Coach Maya',
    total_capacity: 10,
    booked_slots: 5, // Masih ada 5 kursi kosong!
    price_per_session_idr: 165000,
  },
];

export const changeRequests: ChangeRequestProposal[] = [];
