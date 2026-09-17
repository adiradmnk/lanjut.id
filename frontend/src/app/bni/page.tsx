'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  Store,
  ArrowRight,
  ExternalLink,
  Activity,
  AlertTriangle,
  Users,
  RefreshCw,
  Search,
  Bell,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  HelpCircle,
  FileText
} from 'lucide-react';

interface PortfolioSummary {
  total_sme_merchants_supervised: number;
  total_loan_exposure_idr: number;
  portfolio_npl_rate_pct: number;
  projected_npl_without_lanjut_pct: number;
  total_bni_va_turnover_month_idr: number;
  macro_health_index: string;
}

interface MerchantDebtor {
  id: string;
  name: string;
  category: string;
  loan_plafond_idr: number;
  monthly_installment_idr: number;
  retention_rate_pct: number;
  capacity_utilization_pct: number;
  dscr_ratio: number;
  risk_level: 'LOW' | 'WATCHLIST' | 'HIGH' | 'PROBATION';
  early_warning_signal: string;
  recommended_rm_action: string;
  ai_decision_support?: {
    credit_health_index: string;
    ai_risk_rationale: string | string[];
    compliance_disclaimer: string;
  };
}

export default function BniDashboardPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    total_sme_merchants_supervised: 48,
    total_loan_exposure_idr: 12450000000,
    portfolio_npl_rate_pct: 0.42,
    projected_npl_without_lanjut_pct: 3.18,
    total_bni_va_turnover_month_idr: 342000000,
    macro_health_index: 'PRIME_EXCELLENT',
  });

  const [merchants, setMerchants] = useState<MerchantDebtor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantDebtor | null>(null);
  const [activeTab, setActiveTab] = useState<'debtors' | 'macro' | 'ews'>('debtors');

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch real BNI portfolio health
      const portRes = await fetch('/api/bni/portfolio-health');
      if (portRes.ok) {
        const p = await portRes.json();
        if (p.portfolio) setPortfolio(p.portfolio);
      }

      // 2. Fetch real SME Merchant debtors list with AI DSS scoring
      const merRes = await fetch('/api/bni/merchant-list');
      if (merRes.ok) {
        const m = await merRes.json();
        if (m.merchants) {
          setMerchants(m.merchants);
          if (m.merchants.length > 0 && !selectedMerchant) {
            setSelectedMerchant(m.merchants[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat data portofolio BNI:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto sync state via polling (setiap 4 detik) agar real-time saat simulasi di /member ditekan
    const interval = setInterval(() => {
      loadData();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-800 font-sans antialiased p-3 sm:p-6 lg:p-8">
      {/* Outer Shell container matching Zentra Fintech Aesthetics */}
      <div className="max-w-[1520px] mx-auto bg-white rounded-[28px] shadow-[0_2px_18px_rgba(0,0,0,0.04)] border border-neutral-200/80 overflow-hidden">

        {/* =========================================================================
            1. TOP HEADER (BNI RELATIONSHIP MANAGER PORTAL)
           ========================================================================= */}
        <header className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 bg-white">
          <div className="flex items-center gap-6">
            {/* Brand Mark with BNI Identity */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#005E6A] flex items-center justify-center text-white font-black text-xs shadow-sm">
                BNI
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black tracking-tight text-neutral-900">
                    BNI SME Credit Intelligence
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Live Surveillance
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Relationship Manager & Early Warning System (EWS)
                </p>
              </div>
            </div>

            {/* Pill Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('debtors')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'debtors'
                    ? 'bg-neutral-900 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                Debitur UMKM ({portfolio.total_sme_merchants_supervised})
              </button>
              <button
                onClick={() => setActiveTab('ews')}
                className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  activeTab === 'ews'
                    ? 'bg-neutral-900 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <span>AI Early Warning</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </button>
              <button
                onClick={() => setActiveTab('macro')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'macro'
                    ? 'bg-neutral-900 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                Portofolio Makro
              </button>
            </nav>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            <Link
              href="/merchant"
              className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200/60"
            >
              <span>Dashboard Gym</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </Link>
            <Link
              href="/member?member_id=mbr-dina-01"
              target="_blank"
              className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Simulasi Member</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={loadData}
              disabled={isLoading}
              title="Refresh Data Riil"
              className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 text-neutral-500 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-neutral-800' : ''}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#005E6A] text-white font-bold text-xs flex items-center justify-center shadow-inner">
              RM
            </div>
          </div>
        </header>

        {/* =========================================================================
            2. SUBHEADER: TITLE & DATE FILTER
           ========================================================================= */}
        <div className="px-8 pt-7 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-neutral-900">
                Portfolio Risk & Debt Service Coverage
              </h2>
              <span className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 text-xs font-bold cursor-pointer hover:bg-neutral-200">
                &bull;
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live Closed-Loop Telemetry &bull; Sinkronisasi Otomatis dengan Transaksi BNI VA & Retensi Member
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-3.5 py-1.5 rounded-full bg-neutral-100/90 border border-neutral-200/80 text-neutral-700 font-medium flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>Periode Berjalan: Sep 2026</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-Time Sync Aktif</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. MAIN CONTENT
           ========================================================================= */}
        <div className="p-6 lg:p-8 pt-2 space-y-6">

          {/* ==================== ROW 1: PORTFOLIO OVERVIEW METRICS ==================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Total Loan Exposure */}
            <div className="p-5 rounded-[22px] bg-[#fafafa] border border-neutral-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex justify-between items-center text-neutral-500 text-xs font-medium">
                <span>Total Eksposur Pinjaman</span>
                <Building2 className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(portfolio.total_loan_exposure_idr)}
              </div>
              <div className="text-[11px] text-neutral-400">
                {portfolio.total_sme_merchants_supervised} Debitur UMKM Terdaftar
              </div>
            </div>

            {/* Metric 2: BNI VA Turnover (Live Sync) */}
            <div className="p-5 rounded-[22px] bg-[#fafafa] border border-neutral-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex justify-between items-center text-neutral-500 text-xs font-medium">
                <span>Perputaran BNI VA (Bulan Ini)</span>
                <CreditCard className="w-4 h-4 text-[#005E6A]" />
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 tracking-tight">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(portfolio.total_bni_va_turnover_month_idr)}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Kas Terlindungi via Ekosistem BNI</span>
              </div>
            </div>

            {/* Metric 3: Portfolio NPL Rate */}
            <div className="p-5 rounded-[22px] bg-[#fafafa] border border-neutral-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex justify-between items-center text-neutral-500 text-xs font-medium">
                <span>Tingkat NPL Portofolio</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-emerald-700 tracking-tight">
                {portfolio.portfolio_npl_rate_pct}%
              </div>
              <div className="text-[11px] text-neutral-500">
                vs <span className="line-through text-red-500 font-semibold">{portfolio.projected_npl_without_lanjut_pct}%</span> (Tanpa Intervensi)
              </div>
            </div>

            {/* Metric 4: Watchlist Count */}
            <div className="p-5 rounded-[22px] bg-[#fafafa] border border-neutral-200/90 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-1">
              <div className="flex justify-between items-center text-neutral-500 text-xs font-medium">
                <span>Debitur Dalam Pantauan</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl lg:text-3xl font-extrabold text-amber-600 tracking-tight">
                {merchants.filter((m) => m.risk_level === 'WATCHLIST').length} Debitur
              </div>
              <div className="text-[11px] text-neutral-400">
                Risiko Churn Terdeteksi Dini
              </div>
            </div>

          </div>

          {/* ==================== ROW 2: AI EARLY WARNING SIGNAL BRIEFING ==================== */}
          <div className="rounded-[24px] bg-gradient-to-br from-[#005E6A] via-[#094852] to-neutral-900 text-white p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Early Warning System (EWS) Briefing</span>
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-white tracking-tight">
                  {selectedMerchant
                    ? `${selectedMerchant.name} &bull; Evaluasi Kelayakan Arus Kas Kredit`
                    : 'Diagnosis Kesehatan Kredit Debitur UMKM'}
                </h3>
                <p className="text-xs text-white/80 leading-relaxed">
                  {selectedMerchant?.early_warning_signal ||
                    'Sistem AI memantau kontinuitas perputaran kas debitur gym melalui kehadiran member & pelunasan BNI VA.'}
                </p>
                {selectedMerchant?.recommended_rm_action && (
                  <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs text-white/95 mt-2">
                    <span className="font-bold text-amber-300">Rekomendasi Tindakan RM: </span>
                    {selectedMerchant.recommended_rm_action}
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="lg:text-right shrink-0">
                <div className="text-xs text-white/70">Kalkulasi Skor DSCR</div>
                <div className="text-3xl font-black text-white mt-0.5">
                  {selectedMerchant?.dscr_ratio || 2.41}x
                </div>
                <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {selectedMerchant?.risk_level === 'LOW' ? 'Kapasitas Angsuran Prima' : 'Dalam Pemantauan Khusus'}
                </span>
              </div>
            </div>
          </div>

          {/* ==================== ROW 3: DEBITUR UMKM TABLE (RESPONSIVE & OVERFLOW SAFE) ==================== */}
          <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Daftar Portofolio Debitur UMKM Terhubung
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Klik pada baris debitur untuk melihat diagnosa detail & rekomendasi AI
                </p>
              </div>
              <div className="text-xs text-neutral-400">
                Menampilkan {merchants.length} Merchant
              </div>
            </div>

            {/* Scrollable Table Container for Mobile & Tablet Safety */}
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                    <th className="py-2.5 px-3">Nama Debitur UMKM</th>
                    <th className="py-2.5 px-3">Plafon Kredit</th>
                    <th className="py-2.5 px-3">Angsuran / Bln</th>
                    <th className="py-2.5 px-3">Rasio Retensi</th>
                    <th className="py-2.5 px-3">Utilitas Kapasitas</th>
                    <th className="py-2.5 px-3">Skor DSCR</th>
                    <th className="py-2.5 px-3">Tingkat Risiko</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {merchants.map((m) => {
                    const isSelected = selectedMerchant?.id === m.id;
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMerchant(m)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60 font-semibold' : 'hover:bg-white/80'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-neutral-900">{m.name}</div>
                          <div className="text-[10px] text-neutral-400">{m.category}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-neutral-800">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(m.loan_plafond_idr)}
                        </td>
                        <td className="py-3 px-3 text-neutral-600">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(m.monthly_installment_idr)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-neutral-900">{m.retention_rate_pct}%</span>
                        </td>
                        <td className="py-3 px-3 text-neutral-600">
                          {m.capacity_utilization_pct}%
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-neutral-900">{m.dscr_ratio}x</span>
                        </td>
                        <td className="py-3 px-3">
                          {m.risk_level === 'LOW' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              LOW RISK
                            </span>
                          ) : m.risk_level === 'PROBATION' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                              PROBATION (BARU)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              WATCHLIST
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMerchant(m);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-[11px] font-semibold"
                          >
                            Analisis &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* ==================== ROW 4: COMPLIANCE DISCLAIMER (OJK / BI) ==================== */}
          <div className="p-4 rounded-2xl bg-neutral-100/80 border border-neutral-200 text-neutral-600 text-xs flex items-start gap-3">
            <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-neutral-800 block">
                Pemberitahuan Kepatuhan Regulasi Perbankan (OJK & Bank Indonesia)
              </span>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Informasi dan kalkulasi rasio dalam dasbor ini dihasilkan oleh sistem pendukung keputusan (<em>Decision Support System - DSS</em>) berbasis telemetri arus kas dan kehadiran anggota. Seluruh keputusan persetujuan kredit, perubahan plafon, restrukturisasi angsuran, dan penilaian kualitas aktiva sepenuhnya merupakan kewenangan mutlak Komite Kredit PT Bank Negara Indonesia (Persero) Tbk.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-[#fafafa] text-center text-[10px] text-neutral-400">
          PT Bank Negara Indonesia (Persero) Tbk &bull; Sistem Monitoring Kredit UMKM Terintegrasi LANJUT AI
        </div>

      </div>
    </div>
  );
}
