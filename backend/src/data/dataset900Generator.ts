import { MemberRecord, AttendanceLog, ClassSessionRecord } from './relationalStore';

/**
 * 900 Synthetic Functional Dataset Generator for LANJUT Platform
 * Merepresentasikan populasi aktif sebuah gym/fitness studio menengah
 * 
 * Distribusi:
 * 1. Segmen Risiko Tinggi (Critical Churn Risk): ~300 Data (Index 1 - 300)
 *    - Drop attendance streak 3-6 minggu berturut-turut
 *    - Digunakan untuk memicu AI Churn Alert & Dispatch Magic Link BNI VA
 * 2. Segmen Risiko Sedang (Moderate Drift): ~300 Data (Index 301 - 600)
 *    - Presensi menurun / fluktuatif, mulai bosan jadwal pagi
 *    - Digunakan untuk menguji Smart Option Ranker (mencari slot off-peak malam/weekend)
 * 3. Segmen Aman (Active & Stable): ~300 Data (Index 601 - 900)
 *    - Rutin hadir, utilisasi kuota optimal (>75%)
 *    - Kelompok kontrol / baseline untuk rasio DSCR BNI yang sehat
 */

const FIRST_NAMES = [
  'Dina', 'Budi', 'Citra', 'Agus', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi', 'Indah',
  'Joko', 'Kartika', 'Lukman', 'Maya', 'Nanda', 'Oki', 'Putri', 'Rian', 'Siti', 'Taufik',
  'Utami', 'Vino', 'Winda', 'Yoga', 'Zahra', 'Aditya', 'Bella', 'Cahyo', 'Dian', 'Eka',
  'Farhan', 'Grace', 'Hendra', 'Irma', 'Jonathan', 'Kurnia', 'Lestari', 'Mahendra', 'Nadya', 'Oscar'
];

const LAST_NAMES = [
  'Kusuma', 'Santoso', 'Lestari', 'Setiawan', 'Anggraini', 'Prasetyo', 'Nugroho', 'Permata', 'Wijaya', 'Susilo',
  'Sari', 'Hakim', 'Safitri', 'Pratama', 'Setiadi', 'Ayu', 'Hidayat', 'Rahma', 'Ismail', 'Ningsih',
  'Putra', 'Wibowo', 'Siregar', 'Hutapea', 'Nasution', 'Subekti', 'Utomo', 'Hartono', 'Gunawan', 'Tanjung'
];

export function generateSessions900(): ClassSessionRecord[] {
  return [
    {
      id: 'ses-pagi-senin',
      merchant_id: 'mch-fitbody-01',
      title: 'Monday Sunrise Pilates Reformer',
      day_of_week: 'Senin',
      time_slot: '08:00 - 09:00 WIB',
      time_of_day: 'MORNING',
      instructor: 'Coach Sarah',
      total_capacity: 12,
      booked_slots: 10,
      price_per_session_idr: 150000,
    },
    {
      id: 'ses-malam-senin',
      merchant_id: 'mch-fitbody-01',
      title: 'Monday Evening Functional HIIT',
      day_of_week: 'Senin',
      time_slot: '19:00 - 20:00 WIB',
      time_of_day: 'EVENING',
      instructor: 'Coach Alex',
      total_capacity: 15,
      booked_slots: 8, // Sisa 7 kursi kosong
      price_per_session_idr: 160000,
    },
    {
      id: 'ses-pagi-selasa',
      merchant_id: 'mch-fitbody-01',
      title: 'Tuesday Morning Posture & Mobility',
      day_of_week: 'Selasa',
      time_slot: '08:00 - 09:00 WIB',
      time_of_day: 'MORNING',
      instructor: 'Coach Dimas',
      total_capacity: 12,
      booked_slots: 11,
      price_per_session_idr: 150000,
    },
    {
      id: 'ses-malam-selasa',
      merchant_id: 'mch-fitbody-01',
      title: 'Tuesday Night Core & De-stress Pilates',
      day_of_week: 'Selasa',
      time_slot: '19:00 - 20:00 WIB',
      time_of_day: 'EVENING',
      instructor: 'Coach Maya',
      total_capacity: 12,
      booked_slots: 7, // Sisa 5 kursi kosong
      price_per_session_idr: 165000,
    },
    {
      id: 'ses-pagi-rabu',
      merchant_id: 'mch-fitbody-01',
      title: 'Wednesday Core Strength Awakening',
      day_of_week: 'Rabu',
      time_slot: '08:00 - 09:00 WIB',
      time_of_day: 'MORNING',
      instructor: 'Coach Sarah',
      total_capacity: 10,
      booked_slots: 9,
      price_per_session_idr: 150000,
    },
    {
      id: 'ses-malam-rabu',
      merchant_id: 'mch-fitbody-01',
      title: 'Wednesday Night Flow & Recovery',
      day_of_week: 'Rabu',
      time_slot: '19:00 - 20:00 WIB',
      time_of_day: 'EVENING',
      instructor: 'Coach Maya',
      total_capacity: 15,
      booked_slots: 9, // Sisa 6 kursi kosong
      price_per_session_idr: 165000,
    },
    {
      id: 'ses-pagi-kamis',
      merchant_id: 'mch-fitbody-01',
      title: 'Morning Reformer Pilates (Jadwal Pagi)',
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
      merchant_id: 'mch-fitbody-01',
      title: 'Evening Pilates Reformer & De-Stress Flow',
      day_of_week: 'Kamis',
      time_slot: '19:00 - 20:00 WIB',
      time_of_day: 'EVENING',
      instructor: 'Coach Maya',
      total_capacity: 10,
      booked_slots: 6, // Sisa 4 kursi kosong! (Target AI Smart Ranker)
      price_per_session_idr: 165000,
    },
    {
      id: 'ses-malam-jumat',
      merchant_id: 'mch-fitbody-01',
      title: 'Friday Sunset Core & Posture Release',
      day_of_week: 'Jumat',
      time_slot: '19:00 - 20:00 WIB',
      time_of_day: 'EVENING',
      instructor: 'Coach Dimas',
      total_capacity: 12,
      booked_slots: 7, // Sisa 5 kursi kosong
      price_per_session_idr: 165000,
    },
    {
      id: 'ses-weekend-sabtu-pagi',
      merchant_id: 'mch-fitbody-01',
      title: 'Saturday Weekend Power Flow',
      day_of_week: 'Sabtu',
      time_slot: '10:00 - 11:00 WIB',
      time_of_day: 'MORNING',
      instructor: 'Coach Sarah',
      total_capacity: 15,
      booked_slots: 15, // Penuh 100%
      price_per_session_idr: 180000,
    },
    {
      id: 'ses-weekend-sabtu-sore',
      merchant_id: 'mch-fitbody-01',
      title: 'Saturday Sunset Calisthenics & Stretch',
      day_of_week: 'Sabtu',
      time_slot: '16:30 - 17:30 WIB',
      time_of_day: 'AFTERNOON',
      instructor: 'Coach Alex',
      total_capacity: 15,
      booked_slots: 9, // Sisa 6 kursi kosong
      price_per_session_idr: 175000,
    },
    {
      id: 'ses-weekend-minggu-pagi',
      merchant_id: 'mch-fitbody-01',
      title: 'Sunday Gentle Reformer & Breathing',
      day_of_week: 'Minggu',
      time_slot: '09:00 - 10:00 WIB',
      time_of_day: 'MORNING',
      instructor: 'Coach Dimas',
      total_capacity: 12,
      booked_slots: 10,
      price_per_session_idr: 165000,
    },
  ];
}

export function generate900MembersAndLogs(nowMs: number = Date.now()): {
  members: MemberRecord[];
  logs: AttendanceLog[];
} {
  const members: MemberRecord[] = [];
  const logs: AttendanceLog[] = [];

  // Member 1 Spesifik: Dina Kusuma (Anchor Demo Persona)
  const dina: MemberRecord = {
    id: 'mbr-dina-01',
    merchant_id: 'mch-fitbody-01',
    name: 'Dina Kusuma',
    email: 'dina.kusuma@example.com',
    phone: '081298765432',
    current_package: 'Monthly Morning Pilates (Jadwal 08.00 WIB)',
    package_tier: 'UNLIMITED',
    active_until: new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString(),
    total_quota: 8,
    used_quota: 2,
    joined_at: '2026-06-01T08:00:00Z',
    churn_risk_flag: 'HIGH',
  };
  members.push(dina);

  for (let i = 1; i <= 12; i++) {
    const daysAgo = i * 7;
    const sessionDate = new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const attended = daysAgo > 21; // 3 minggu terakhir missed
    logs.push({
      id: `att-dina-${i}`,
      member_id: dina.id,
      session_id: 'ses-pagi-kamis',
      session_date: sessionDate,
      attended,
      status: attended ? 'ATTENDED' : 'MISSED',
    });
  }

  // Loop generate 899 Member lainnya (Total 900)
  for (let idx = 2; idx <= 900; idx++) {
    const fn = FIRST_NAMES[(idx - 2) % FIRST_NAMES.length];
    const ln = LAST_NAMES[Math.floor((idx - 2) / FIRST_NAMES.length) % LAST_NAMES.length];
    const memberName = `${fn} ${ln}`;
    const memberId = `mbr-${String(idx).padStart(4, '0')}`;

    let riskFlag: 'HIGH' | 'MEDIUM' | 'LOW';
    let totalQuota = 8;
    let usedQuota = 0;
    let daysRemaining = 30;
    let packageName = '';
    let packageTier: 'BASIC' | 'PRO' | 'UNLIMITED';

    if (idx <= 300) {
      riskFlag = 'HIGH';
      usedQuota = (idx % 3); // 0, 1, 2 dari 8
      daysRemaining = 3 + (idx % 5); // 3 - 7 hari sisa
      packageName = 'Monthly Morning Reformer (08:00 WIB)';
      packageTier = 'BASIC';
    } else if (idx <= 600) {
      riskFlag = 'MEDIUM';
      usedQuota = 3 + (idx % 2); // 3 atau 4 dari 8
      daysRemaining = 12 + (idx % 14); // 12 - 25 hari sisa
      packageName = 'Monthly Functional Core Standard';
      packageTier = 'PRO';
    } else {
      riskFlag = 'LOW';
      usedQuota = 6 + (idx % 3); // 6, 7, 8 dari 8
      daysRemaining = 20 + (idx % 15); // 20 - 34 hari sisa
      packageName = 'All-Access Unlimited Pilates & Gym';
      packageTier = 'UNLIMITED';
    }

    const member: MemberRecord = {
      id: memberId,
      merchant_id: 'mch-fitbody-01',
      name: memberName,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${idx}@lanjut.app`,
      phone: `0812${String(idx).padStart(8, '0')}`,
      current_package: packageName,
      package_tier: packageTier,
      active_until: new Date(nowMs + daysRemaining * 24 * 60 * 60 * 1000).toISOString(),
      total_quota: totalQuota,
      used_quota: usedQuota,
      joined_at: new Date(nowMs - 120 * 24 * 60 * 60 * 1000).toISOString(),
      churn_risk_flag: riskFlag,
    };
    members.push(member);

    const logCount = 8;
    for (let w = 1; w <= logCount; w++) {
      const daysAgo = w * 7;
      let attended = false;

      if (riskFlag === 'HIGH') {
        attended = daysAgo > 21 && (w % 2 === 0);
      } else if (riskFlag === 'MEDIUM') {
        attended = w > 4 ? (w % 2 === 0) : (w === 2);
      } else {
        attended = w % 5 !== 0;
      }

      logs.push({
        id: `att-${memberId}-${w}`,
        member_id: memberId,
        session_id: 'ses-pagi-kamis',
        session_date: new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        attended,
        status: attended ? 'ATTENDED' : 'MISSED',
      });
    }
  }

  return { members, logs };
}
