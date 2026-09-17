import { generate900MembersAndLogs, generateSessions900 } from './dataset900Generator';

export interface TenantConfig {
  max_retention_discount_pct: number;
  min_slot_fill_ratio_target: number;
  auto_intervention_threshold_days: number;
  min_margin_floor_idr: number;
}

export interface TenantRecord {
  id: string;
  business_name: string;
  category: string;
  bni_account_number: string;
  bni_company_code: string;
  bni_va_prefix: string;
  loan_plafond_idr: number;
  monthly_installment_idr: number;
  loan_tenor_months: number;
  config: TenantConfig;
}

export interface MemberRecord {
  id: string;
  merchant_id: string;
  name: string;
  email: string;
  phone: string;
  current_package: string;
  package_tier: 'BASIC' | 'PRO' | 'UNLIMITED';
  active_until: string;
  total_quota: number;
  used_quota: number;
  joined_at: string;
  churn_risk_flag: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AttendanceLog {
  id: string;
  member_id: string;
  session_id: string;
  session_date: string;
  attended: boolean;
  status: 'ATTENDED' | 'MISSED' | 'CANCELLED';
}

export interface ClassSessionRecord {
  id: string;
  merchant_id: string;
  title: string;
  day_of_week: string;
  time_slot: string;
  time_of_day: 'MORNING' | 'AFTERNOON' | 'EVENING';
  instructor: string;
  total_capacity: number;
  booked_slots: number;
  price_per_session_idr: number;
}

export interface TransactionRecord {
  trx_id: string;
  merchant_id?: string;
  member_id: string;
  session_id: string;
  session_title: string;
  amount: number;
  bni_va_number: string;
  bni_signature: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  created_at: string;
  paid_at?: string;
}

// In-Memory Real State Tables with Dynamic Multi-Tenant Queries
class RelationalDatabaseState {
  private tenantsTable: Map<string, TenantRecord> = new Map();
  private membersTable: Map<string, MemberRecord> = new Map();
  private attendanceLogs: AttendanceLog[] = [];
  private classSessionsTable: Map<string, ClassSessionRecord> = new Map();
  private transactionsTable: Map<string, TransactionRecord> = new Map();

  constructor() {
    this.seedRealWorldDataset();
  }

  /**
   * Seeding Multi-Tenant Dataset (FitBody Gym, Zenith Yoga, Surabaya Iron CrossFit, Bandung Pilates)
   */
  private seedRealWorldDataset() {
    const now = Date.now();

    // 1. Seed 4 Tenant UMKM
    const tenants: TenantRecord[] = [
      {
        id: 'mch-fitbody-01',
        business_name: 'FitBody Gym & Functional Movement',
        category: 'Fitness & Wellness',
        bni_account_number: '0129883492',
        bni_company_code: '8241',
        bni_va_prefix: '824101',
        loan_plafond_idr: 350000000,
        monthly_installment_idr: 14200000,
        loan_tenor_months: 36,
        config: {
          max_retention_discount_pct: 15.0,
          min_slot_fill_ratio_target: 0.70,
          auto_intervention_threshold_days: 21,
          min_margin_floor_idr: 50000,
        },
      },
      {
        id: 'mch-zenyoga-02',
        business_name: 'Zenith Yoga Sanctuary & Mindfulness',
        category: 'Boutique Yoga Studio',
        bni_account_number: '0348712948',
        bni_company_code: '8242',
        bni_va_prefix: '824202',
        loan_plafond_idr: 180000000,
        monthly_installment_idr: 7800000,
        loan_tenor_months: 24,
        config: {
          max_retention_discount_pct: 20.0,
          min_slot_fill_ratio_target: 0.65,
          auto_intervention_threshold_days: 14,
          min_margin_floor_idr: 60000,
        },
      },
      {
        id: 'mch-ironcrossfit-03',
        business_name: 'Surabaya Iron CrossFit Box',
        category: 'High-Intensity Strength & Conditioning',
        bni_account_number: '0991283741',
        bni_company_code: '8243',
        bni_va_prefix: '824303',
        loan_plafond_idr: 500000000,
        monthly_installment_idr: 21500000,
        loan_tenor_months: 48,
        config: {
          max_retention_discount_pct: 10.0,
          min_slot_fill_ratio_target: 0.80,
          auto_intervention_threshold_days: 25,
          min_margin_floor_idr: 75000,
        },
      },
      {
        id: 'mch-bandungpilates-04',
        business_name: 'Bandung Core Pilates Studio (Cold-Start)',
        category: 'Pilates Reformer Boutique',
        bni_account_number: '0552391024',
        bni_company_code: '8244',
        bni_va_prefix: '824404',
        loan_plafond_idr: 120000000,
        monthly_installment_idr: 5100000,
        loan_tenor_months: 24,
        config: {
          max_retention_discount_pct: 25.0,
          min_slot_fill_ratio_target: 0.60,
          auto_intervention_threshold_days: 14,
          min_margin_floor_idr: 45000,
        },
      },
    ];
    tenants.forEach((t) => this.tenantsTable.set(t.id, t));

    // 2. Seed Kelas untuk Masing-Masing Tenant
    const sessions: ClassSessionRecord[] = [
      // Sesi Tenant 1 (FitBody Gym)
      {
        id: 'ses-fitbody-pagi-kamis',
        merchant_id: 'mch-fitbody-01',
        title: 'Morning Reformer Pilates',
        day_of_week: 'Kamis',
        time_slot: '08:00 - 09:00 WIB',
        time_of_day: 'MORNING',
        instructor: 'Coach Sarah',
        total_capacity: 10,
        booked_slots: 9,
        price_per_session_idr: 150000,
      },
      {
        id: 'ses-fitbody-malam-kamis',
        merchant_id: 'mch-fitbody-01',
        title: 'Evening Pilates Reformer & De-Stress Flow',
        day_of_week: 'Kamis',
        time_slot: '19:00 - 20:00 WIB',
        time_of_day: 'EVENING',
        instructor: 'Coach Maya',
        total_capacity: 10,
        booked_slots: 6, // Sisa 4 kursi kosong
        price_per_session_idr: 165000,
      },
      {
        id: 'ses-fitbody-malam-jumat',
        merchant_id: 'mch-fitbody-01',
        title: 'Friday Sunset Core & Posture Release',
        day_of_week: 'Jumat',
        time_slot: '19:00 - 20:00 WIB',
        time_of_day: 'EVENING',
        instructor: 'Coach Dimas',
        total_capacity: 12,
        booked_slots: 7,
        price_per_session_idr: 165000,
      },
      // Sesi Tenant 2 (Zenith Yoga)
      {
        id: 'ses-zen-vinyasa-pagi',
        merchant_id: 'mch-zenyoga-02',
        title: 'Sunrise Vinyasa Flow & Pranayama',
        day_of_week: 'Rabu',
        time_slot: '07:00 - 08:15 WIB',
        time_of_day: 'MORNING',
        instructor: 'Master Anand',
        total_capacity: 15,
        booked_slots: 14,
        price_per_session_idr: 140000,
      },
      {
        id: 'ses-zen-yin-malam',
        merchant_id: 'mch-zenyoga-02',
        title: 'Candlelight Yin Yoga & Sound Bath',
        day_of_week: 'Kamis',
        time_slot: '19:30 - 20:45 WIB',
        time_of_day: 'EVENING',
        instructor: 'Guru Devi',
        total_capacity: 15,
        booked_slots: 9, // Sisa 6 kursi kosong
        price_per_session_idr: 155000,
      },
      // Sesi Tenant 3 (Surabaya Iron CrossFit)
      {
        id: 'ses-cross-wod-pagi',
        merchant_id: 'mch-ironcrossfit-03',
        title: 'Olympic Weightlifting & Hero WOD',
        day_of_week: 'Selasa',
        time_slot: '06:30 - 07:30 WIB',
        time_of_day: 'MORNING',
        instructor: 'Coach Anton',
        total_capacity: 20,
        booked_slots: 19,
        price_per_session_idr: 175000,
      },
      {
        id: 'ses-cross-wod-malam',
        merchant_id: 'mch-ironcrossfit-03',
        title: 'Endurance Metcon Night Ops',
        day_of_week: 'Kamis',
        time_slot: '19:00 - 20:00 WIB',
        time_of_day: 'EVENING',
        instructor: 'Coach Anton',
        total_capacity: 20,
        booked_slots: 12, // Sisa 8 kursi kosong
        price_per_session_idr: 175000,
      },
      // Sesi Tenant 4 (Bandung Pilates Core - Cold Start)
      {
        id: 'ses-bdg-reformer-basic',
        merchant_id: 'mch-bandungpilates-04',
        title: 'Basic Cadilac Reformer Intro',
        day_of_week: 'Senin',
        time_slot: '10:00 - 11:00 WIB',
        time_of_day: 'MORNING',
        instructor: 'Coach Nadia',
        total_capacity: 8,
        booked_slots: 2, // Sisa 6 kursi kosong
        price_per_session_idr: 130000,
      },
    ];
    sessions.forEach((s) => this.classSessionsTable.set(s.id, s));

    // 3. Seed Multi-Persona Member Tersebar di Tenant Berbeda
    const seedMembers: MemberRecord[] = [
      // Member Tenant 1: Dina Kusuma (FitBody)
      {
        id: 'mbr-dina-01',
        merchant_id: 'mch-fitbody-01',
        name: 'Dina Kusuma',
        email: 'dina.kusuma@example.com',
        phone: '081298765432',
        current_package: 'Monthly Morning Pilates (Jadwal 08.00 WIB)',
        package_tier: 'UNLIMITED',
        active_until: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        total_quota: 8,
        used_quota: 2,
        joined_at: '2026-06-01T08:00:00Z',
        churn_risk_flag: 'HIGH',
      },
      // Member Tenant 1: Budi Santoso (FitBody)
      {
        id: 'mbr-budi-02',
        merchant_id: 'mch-fitbody-01',
        name: 'Budi Santoso',
        email: 'budi.santoso@example.com',
        phone: '081211223344',
        current_package: 'All-Access Strength & Core Tier',
        package_tier: 'PRO',
        active_until: new Date(now + 25 * 24 * 60 * 60 * 1000).toISOString(),
        total_quota: 12,
        used_quota: 10,
        joined_at: '2026-05-15T08:00:00Z',
        churn_risk_flag: 'LOW',
      },
      // Member Tenant 2: Siti Rahma (Zenith Yoga - Berisiko Churn)
      {
        id: 'mbr-siti-03',
        merchant_id: 'mch-zenyoga-02',
        name: 'Siti Rahma',
        email: 'siti.rahma@example.com',
        phone: '081399887766',
        current_package: 'Zen Morning Vinyasa Unlimited',
        package_tier: 'UNLIMITED',
        active_until: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(),
        total_quota: 10,
        used_quota: 3, // Absen 3 minggu terakhir
        joined_at: '2026-07-01T09:00:00Z',
        churn_risk_flag: 'HIGH',
      },
      // Member Tenant 3: Kevin Tan (Surabaya Iron CrossFit - Berisiko Churn)
      {
        id: 'mbr-kevin-04',
        merchant_id: 'mch-ironcrossfit-03',
        name: 'Kevin Tan',
        email: 'kevin.tan@example.com',
        phone: '081755443322',
        current_package: 'Morning WOD Dedicated Pass',
        package_tier: 'PRO',
        active_until: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
        total_quota: 12,
        used_quota: 4,
        joined_at: '2026-06-10T10:00:00Z',
        churn_risk_flag: 'HIGH',
      },
      // Member Tenant 4: Anisa Putri (Bandung Pilates - Cold-Start)
      {
        id: 'mbr-anisa-05',
        merchant_id: 'mch-bandungpilates-04',
        name: 'Anisa Putri',
        email: 'anisa.putri@example.com',
        phone: '081922334455',
        current_package: 'Reformer Intro 4-Sessions',
        package_tier: 'BASIC',
        active_until: new Date(now + 28 * 24 * 60 * 60 * 1000).toISOString(),
        total_quota: 4,
        used_quota: 1,
        joined_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
        churn_risk_flag: 'LOW',
      },
    ];

    seedMembers.forEach((m) => this.membersTable.set(m.id, m));

    // 4. Seed Log Presensi untuk Dina, Siti, dan Kevin
    const atRiskMembers = ['mbr-dina-01', 'mbr-siti-03', 'mbr-kevin-04'];
    atRiskMembers.forEach((memId) => {
      for (let i = 1; i <= 12; i++) {
        const daysAgo = i * 7;
        const attended = daysAgo > 21; // Absen 3 minggu terakhir
        this.attendanceLogs.push({
          id: `att-${memId}-${i}`,
          member_id: memId,
          session_id: 'ses-fitbody-pagi-kamis',
          session_date: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          attended,
          status: attended ? 'ATTENDED' : 'MISSED',
        });
      }
    });

    // 5. Seed 45 Member Tambahan Tersebar Antar-Tenant
    const names = [
      'Budi Santoso', 'Citra Lestari', 'Agus Setiawan', 'Dewi Anggraini', 'Eko Prasetyo',
      'Fajar Nugroho', 'Gita Permata', 'Hadi Wijaya', 'Indah Kusuma', 'Joko Susilo',
      'Kartika Sari', 'Lukman Hakim', 'Maya Safitri', 'Nanda Pratama', 'Oki Setiadi',
      'Putri Ayu', 'Rian Hidayat', 'Siti Rahma', 'Taufik Ismail', 'Utami Ningsih'
    ];

    const tenantIds = ['mch-fitbody-01', 'mch-zenyoga-02', 'mch-ironcrossfit-03'];
    for (let idx = 6; idx <= 50; idx++) {
      const baseName = names[(idx - 6) % names.length];
      const memberId = `mbr-${String(idx).padStart(3, '0')}`;
      const assignedTenant = tenantIds[(idx - 6) % tenantIds.length];
      const isRisk = idx <= 8; // Beberapa member lain berisiko

      const mem: MemberRecord = {
        id: memberId,
        merchant_id: assignedTenant,
        name: `${baseName} ${idx}`,
        email: `member${idx}@example.com`,
        phone: `08129800${String(idx).padStart(4, '0')}`,
        current_package: isRisk ? 'Monthly Morning Session' : 'All-Access Tier Pass',
        package_tier: isRisk ? 'BASIC' : 'PRO',
        active_until: new Date(now + (isRisk ? 5 : 25) * 24 * 60 * 60 * 1000).toISOString(),
        total_quota: 8,
        used_quota: isRisk ? 2 : 6,
        joined_at: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
        churn_risk_flag: isRisk ? 'HIGH' : 'LOW',
      };
      this.membersTable.set(mem.id, mem);
    }

    // 6. Seed Riwayat Transaksi BNI VA Masuk
    // Tenant 1 (FitBody): 34 transaksi terselesaikan
    for (let t = 1; t <= 34; t++) {
      this.transactionsTable.set(`TRX-FIT-${t}`, {
        trx_id: `TRX-FIT-${t}`,
        merchant_id: 'mch-fitbody-01',
        member_id: `mbr-${String(10 + t).padStart(3, '0')}`,
        session_id: 'ses-fitbody-malam-kamis',
        session_title: 'Evening Pilates Reformer & De-Stress Flow',
        amount: 67500,
        bni_va_number: `824101998822${String(t).padStart(4, '0')}`,
        bni_signature: 'VALIDATED_HMAC',
        status: 'PAID',
        created_at: new Date(now - (35 - t) * 24 * 60 * 60 * 1000).toISOString(),
        paid_at: new Date(now - (35 - t) * 24 * 60 * 60 * 1000 + 300000).toISOString(),
      });
    }

    // Tenant 2 (Zenith Yoga): 22 transaksi terselesaikan
    for (let t = 1; t <= 22; t++) {
      this.transactionsTable.set(`TRX-ZEN-${t}`, {
        trx_id: `TRX-ZEN-${t}`,
        merchant_id: 'mch-zenyoga-02',
        member_id: `mbr-${String(20 + t).padStart(3, '0')}`,
        session_id: 'ses-zen-yin-malam',
        session_title: 'Candlelight Yin Yoga & Sound Bath',
        amount: 72000,
        bni_va_number: `824202998833${String(t).padStart(4, '0')}`,
        bni_signature: 'VALIDATED_HMAC',
        status: 'PAID',
        created_at: new Date(now - (30 - t) * 24 * 60 * 60 * 1000).toISOString(),
        paid_at: new Date(now - (30 - t) * 24 * 60 * 60 * 1000 + 300000).toISOString(),
      });
    }

    // Tenant 3 (Surabaya Iron CrossFit): 40 transaksi terselesaikan
    for (let t = 1; t <= 40; t++) {
      this.transactionsTable.set(`TRX-CROSS-${t}`, {
        trx_id: `TRX-CROSS-${t}`,
        merchant_id: 'mch-ironcrossfit-03',
        member_id: `mbr-${String(5 + t).padStart(3, '0')}`,
        session_id: 'ses-cross-wod-malam',
        session_title: 'Endurance Metcon Night Ops',
        amount: 85000,
        bni_va_number: `824303998844${String(t).padStart(4, '0')}`,
        bni_signature: 'VALIDATED_HMAC',
        status: 'PAID',
        created_at: new Date(now - (40 - t) * 24 * 60 * 60 * 1000).toISOString(),
        paid_at: new Date(now - (40 - t) * 24 * 60 * 60 * 1000 + 300000).toISOString(),
      });
    }
    // Tenant 4 (Bandung Pilates): Belum ada transaksi (Cold Start)

    // 7. Initialize 900 Functional Validation Sandbox Population (FitBody Gym Gym Population)
    const ds900 = generate900MembersAndLogs(now);
    ds900.members.forEach((m) => this.membersTable.set(m.id, m));
    this.attendanceLogs.push(...ds900.logs);

    // Seed 12 Classes from dataset900
    const sessions900 = generateSessions900();
    sessions900.forEach((s) => this.classSessionsTable.set(s.id, s));
  }

  // --- 900 FUNCTIONAL VALIDATION DATASET ACCESSORS ---

  public getDataset900Members(options?: {
    risk_filter?: 'HIGH' | 'MEDIUM' | 'LOW' | 'ALL';
    search?: string;
    limit?: number;
    offset?: number;
  }): {
    members: MemberRecord[];
    total: number;
    counts: { high: number; medium: number; low: number; total: number };
  } {
    let all = Array.from(this.membersTable.values());

    const counts = {
      high: all.filter((m) => m.churn_risk_flag === 'HIGH').length,
      medium: all.filter((m) => m.churn_risk_flag === 'MEDIUM').length,
      low: all.filter((m) => m.churn_risk_flag === 'LOW').length,
      total: all.length,
    };

    if (options?.risk_filter && options.risk_filter !== 'ALL') {
      all = all.filter((m) => m.churn_risk_flag === options.risk_filter);
    }

    if (options?.search) {
      const q = options.search.toLowerCase();
      all = all.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const paginated = all.slice(offset, offset + limit);

    return {
      members: paginated,
      total: all.length,
      counts,
    };
  }

  public getDataset900Metrics() {
    const all = Array.from(this.membersTable.values());
    const highRisk = all.filter((m) => m.churn_risk_flag === 'HIGH');
    const mediumRisk = all.filter((m) => m.churn_risk_flag === 'MEDIUM');
    const lowRisk = all.filter((m) => m.churn_risk_flag === 'LOW');

    const totalMembers = all.length;
    const retentionRate = parseFloat((((totalMembers - highRisk.length) / Math.max(1, totalMembers)) * 100).toFixed(1));
    const estVaTurnover = (lowRisk.length * 350000) + (mediumRisk.length * 250000) + (34 * 67500);

    return {
      total_active_members: totalMembers,
      high_risk_count: highRisk.length,
      medium_risk_count: mediumRisk.length,
      low_risk_count: lowRisk.length,
      retention_rate_pct: retentionRate,
      estimated_monthly_bni_va_turnover_idr: estVaTurnover,
      sessions_count: this.classSessionsTable.size,
    };
  }

  // --- MULTI-TENANT QUERY INTERFACE (ISOLATED & STRICT) ---

  public getTenant(merchantId: string): TenantRecord | undefined {
    return this.tenantsTable.get(merchantId);
  }

  public getAllTenants(): TenantRecord[] {
    return Array.from(this.tenantsTable.values());
  }

  public getMember(id: string): MemberRecord | undefined {
    return this.membersTable.get(id);
  }

  public getAllMembers(): MemberRecord[] {
    return Array.from(this.membersTable.values());
  }

  public getMembersByMerchant(merchantId: string): MemberRecord[] {
    return Array.from(this.membersTable.values()).filter((m) => m.merchant_id === merchantId);
  }

  public getAttendanceHistory(memberId: string): AttendanceLog[] {
    return this.attendanceLogs
      .filter((l) => l.member_id === memberId)
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }

  public getAvailableSessions(merchantId?: string): ClassSessionRecord[] {
    const all = Array.from(this.classSessionsTable.values());
    if (merchantId) {
      return all.filter((s) => s.merchant_id === merchantId);
    }
    return all;
  }

  public getSession(id: string): ClassSessionRecord | undefined {
    return this.classSessionsTable.get(id);
  }

  public getTransactionsByMerchant(merchantId: string): TransactionRecord[] {
    return Array.from(this.transactionsTable.values()).filter((t) => t.merchant_id === merchantId);
  }

  public getMonthlyVaTurnoverByMerchant(merchantId: string): number {
    return Array.from(this.transactionsTable.values())
      .filter((t) => t.merchant_id === merchantId && t.status === 'PAID')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Atomic Capacity Booking dengan Pengecekan Ketat di Level Data
   */
  public bookClassSlot(sessionId: string): { success: boolean; error?: string; session?: ClassSessionRecord } {
    const session = this.classSessionsTable.get(sessionId);
    if (!session) {
      return { success: false, error: 'SESSION_NOT_FOUND' };
    }
    if (session.booked_slots >= session.total_capacity) {
      return { success: false, error: 'CLASS_CAPACITY_EXCEEDED' };
    }

    session.booked_slots += 1;
    return { success: true, session };
  }

  /**
   * Atomic Transaction Idempotency Check & Insert
   */
  public createPendingTransaction(trx: TransactionRecord): { success: boolean; error?: string } {
    if (this.transactionsTable.has(trx.trx_id)) {
      return { success: false, error: 'TRX_ID_ALREADY_EXISTS' };
    }
    const resolvedMerchantId = trx.merchant_id || this.getMember(trx.member_id)?.merchant_id || 'mch-001';
    this.transactionsTable.set(trx.trx_id, {
      ...trx,
      merchant_id: resolvedMerchantId,
    });
    return { success: true };
  }

  public getTransaction(trxId: string): TransactionRecord | undefined {
    return this.transactionsTable.get(trxId);
  }

  /**
   * Idempotent Settle Payment Webhook
   */
  public settleTransaction(trxId: string): { success: boolean; alreadyProcessed: boolean; trx?: TransactionRecord } {
    const trx = this.transactionsTable.get(trxId);
    if (!trx) {
      return { success: false, alreadyProcessed: false };
    }

    // Closed-Loop Idempotency Check: Bila sudah dibayar, tolak eksekusi ganda!
    if (trx.status === 'PAID') {
      return { success: true, alreadyProcessed: true, trx };
    }

    trx.status = 'PAID';
    trx.paid_at = new Date().toISOString();

    // Update member package & reset churn risk
    const member = this.membersTable.get(trx.member_id);
    if (member) {
      member.current_package = trx.session_title;
      member.churn_risk_flag = 'LOW';
    }

    // Book slot jika belum
    const session = this.classSessionsTable.get(trx.session_id);
    if (session && session.booked_slots < session.total_capacity) {
      session.booked_slots += 1;
    }

    return { success: true, alreadyProcessed: false, trx };
  }
}

export const dbStore = new RelationalDatabaseState();
