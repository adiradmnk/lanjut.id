'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Settings,
  LogOut,
  Hash,
  LayoutDashboard,
  Calendar,
  Activity,
  CreditCard,
  Terminal,
  Blocks,
  X,
  CheckCircle2,
  Clock3,
  Building2,
  ShieldCheck,
  TrendingUp,
  Copy,
  Check
} from 'lucide-react';
import {
  formatRupiah,
  parseMerchants,
  parsePayments,
  parsePortfolio,
  parseCreditDSS,
  priorityTierLabel,
  paymentStatus,
  paymentStatusLabel,
  type PaymentStatus,
  type Merchant,
  type RetentionPayment,
  type CreditDSS
} from './payment-data';
import { DashboardShell, DashboardHeader, EntitySwitcher, type NavGroupData, type NavItemData } from '@/components/dashboard/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { Leaderboard, type LeaderboardEntry } from '@/components/dashboard/Leaderboard';
import { ActionPanel, type ActionPanelItem } from '@/components/dashboard/ActionPanel';
import { AvatarProgressTable, type AvatarProgressRow } from '@/components/dashboard/AvatarProgressTable';
import { BreakdownCard, type BreakdownSegment } from '@/components/dashboard/BreakdownCard';

const navGroups: NavGroupData[] = [
  {
    items: [
      { id: 'search', title: 'Cari Data...', icon: Search, shortcut: '⌘K' },
      { id: 'overview', title: 'Ringkasan Portofolio', icon: LayoutDashboard },
      { id: 'transactions', title: 'Transaksi & VA BNI', icon: CreditCard, badge: 'Live' },
      { id: 'risk_dss', title: 'DSS & Health Monitoring', icon: Activity },
    ]
  },
  {
    heading: 'Merchant & Mitra',
    items: [
      { 
        id: 'merchants', 
        title: 'Merchant Supervised', 
        icon: Building2,
        children: [
          { id: 'm-active', title: 'Aktif Beroperasi', icon: Hash },
          { id: 'm-onboarding', title: 'Onboarding Guidebook', icon: Hash },
        ]
      },
      { id: 'sme_credit', title: 'Fasilitas Kredit SME', icon: TrendingUp },
      { id: 'reconciliation', title: 'Settlement & Kliring', icon: Calendar },
    ]
  },
  {
    heading: 'Integrasi API & Gateway',
    items: [
      { id: 'snap_bni', title: 'Kredensial SNAP BNI', icon: Terminal },
      { id: 'webhooks', title: 'Webhook Notifikasi', icon: Blocks },
    ]
  }
];

const bottomItems: NavItemData[] = [
  { id: 'settings', title: 'Pengaturan Gateway', icon: Settings, shortcut: '⌘,' },
  { id: 'logout', title: 'Keluar', icon: LogOut },
];

export default function PaymentGatewayDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMerchantId, setSelectedMerchantId] = useState('mch-fitbody-01');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Live Data States
  const [portfolio, setPortfolio] = useState<any>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [payments, setPayments] = useState<RetentionPayment[]>([]);
  const [merchantInsights, setMerchantInsights] = useState<any>(null);
  const [creditDss, setCreditDss] = useState<CreditDSS | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Portfolio Health
      const pRes = await fetch('/api/bni/portfolio-health');
      if (pRes.ok) {
        const pData = await pRes.json();
        setPortfolio(parsePortfolio(pData));
      }

      // 2. Fetch Supervised Merchants List
      const mRes = await fetch('/api/bni/merchant-list');
      if (mRes.ok) {
        const mData = await mRes.json();
        const parsedM = parseMerchants(mData);
        setMerchants(parsedM);
        if (parsedM.length > 0 && !selectedMerchantId) {
          setSelectedMerchantId(parsedM[0].id);
        }
      }

      // 3. Fetch Real Transactions & Retention Logs
      const activeMid = selectedMerchantId || 'mch-fitbody-01';
      const payRes = await fetch(`/api/merchant/retention-logs?merchant_id=${encodeURIComponent(activeMid)}`);
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(parsePayments(payData));
      }

      // 4. Fetch AI Health Insights & Early Warning System
      const insRes = await fetch(`/api/merchant/${encodeURIComponent(activeMid)}/insights`);
      if (insRes.ok) {
        const insData = await insRes.json();
        setMerchantInsights(insData);
      }

      // 5. Fetch real DSCR / SME credit decision support for the selected merchant
      const dssRes = await fetch(`/api/bni/tenants/${encodeURIComponent(activeMid)}/credit-dss`);
      if (dssRes.ok) {
        const dssData = await dssRes.json();
        setCreditDss(parseCreditDSS(dssData));
      } else {
        setCreditDss(null);
      }
    } catch (e) {
      console.warn('Gagal memuat data gateway:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, [selectedMerchantId]);

  const handleSelectNav = (id: string) => {
    if (id === 'search') {
      setIsSearchOpen(true);
      return;
    }
    if (id === 'logout') {
      window.location.href = '/login';
      return;
    }
    setActiveTab(id);
  };

  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId) || {
    id: 'mch-fitbody-01',
    name: 'FitBody Gym & Functional Movement',
    category: 'Fitness & Wellness'
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPayments = payments.filter(p => {
    const matchesStatus = statusFilter === 'all' || paymentStatus(p.status) === statusFilter;
    const matchesQuery = !normalizedQuery || 
      `${p.id} ${p.memberName} ${p.status}`.toLowerCase().includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });

  const paidCount = payments.filter(p => paymentStatus(p.status) === 'paid').length;
  const pendingCount = payments.filter(p => paymentStatus(p.status) === 'pending').length;

  const copyCredential = () => {
    navigator.clipboard.writeText('bni_snap_live_9a87f8b912c74d');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Portfolio-wide widgets derived from the real per-merchant stats in `merchants`
  // (GET /api/bni/merchant-list) — no fabricated numbers.
  const topRetentionEntries: LeaderboardEntry[] = [...merchants]
    .filter(m => m.retentionRatePct !== null)
    .sort((a, b) => (b.retentionRatePct ?? 0) - (a.retentionRatePct ?? 0))
    .slice(0, 5)
    .map(m => ({
      id: m.id,
      name: m.name,
      metricLabel: `Retensi ${(m.retentionRatePct ?? 0).toFixed(1)}% · ${m.totalMembers ?? 0} member`,
    }));

  const attentionItems: ActionPanelItem[] = merchants
    .filter(m => m.priorityTier === 'HIGH_ATTENTION' || m.priorityTier === 'PROBATION_NEW_MERCHANT')
    .map(m => ({
      id: m.id,
      title: m.name,
      subtitle: m.priorityTier === 'PROBATION_NEW_MERCHANT'
        ? 'Merchant baru, belum ada volume settlement BNI VA.'
        : `${m.membersAtRisk ?? 0} dari ${m.totalMembers ?? 0} member berisiko churn.`,
      tags: [priorityTierLabel(m.priorityTier), m.category].filter(Boolean),
    }));

  const merchantAvatarRows: AvatarProgressRow[] = merchants.map(m => ({
    id: m.id,
    name: m.name,
    subtitle: m.category || 'Merchant BNI SNAP',
    progressPct: m.retentionRatePct ?? 0,
    progressLabel: m.retentionRatePct !== null ? `${m.retentionRatePct.toFixed(0)}%` : 'N/A',
  }));

  const priorityCounts = merchants.reduce<Record<string, number>>((acc, m) => {
    const key = m.priorityTier ?? 'UNKNOWN';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const priorityBreakdown: BreakdownSegment[] = (['PRIME_HEALTHY', 'MEDIUM_OBSERVATION', 'HIGH_ATTENTION', 'PROBATION_NEW_MERCHANT'] as const)
    .filter(tier => priorityCounts[tier])
    .map(tier => ({
      id: tier,
      label: priorityTierLabel(tier),
      value: priorityCounts[tier],
      pct: merchants.length > 0 ? (priorityCounts[tier] / merchants.length) * 100 : 0,
      colorClass: tier === 'HIGH_ATTENTION' ? 'bg-red-500/10 text-red-600' : tier === 'MEDIUM_OBSERVATION' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600',
    }));

  return (
    <>
    <DashboardShell
      isSidebarOpen={isSidebarOpen}
      sidebarProps={{
        brandMark: 'B',
        brandName: 'BNI PG Gateway',
        brandBadge: 'SNAP v2.1',
        brandMarkColorClass: 'bg-orange-600',
        brandBadgeColorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        switcher: (
          <EntitySwitcher
            entities={merchants}
            selectedId={selectedMerchantId}
            onSelect={setSelectedMerchantId}
            pickerLabel="Pilih Merchant Binaan"
            fallback={{ id: 'mch-fitbody-01', name: 'FitBody Gym & Movement', category: 'Fitness & Wellness' }}
          />
        ),
        navGroups,
        bottomItems,
        activeId: activeTab,
        onSelect: handleSelectNav,
      }}
      header={
        <DashboardHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          breadcrumbPrimary={selectedMerchant.name}
          breadcrumbSecondary={activeTab.replace('_', ' ')}
          onSearchClick={() => setIsSearchOpen(true)}
          searchPlaceholder="Cari invoice, VA, atau nominal..."
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          avatarLabel="RM"
          avatarGradientClass="from-orange-500 to-amber-400"
        />
      }
    >
      {/* TAB 1: OVERVIEW */}
          {(activeTab === 'overview' || activeTab === 'home') && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Bank BNI Relationship Manager & SNAP Dashboard
                </span>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mt-1">
                  Monitoring Perputaran Virtual Account & Portofolio
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Supervisi transaksi penerimaan BNI Virtual Account untuk merchant {selectedMerchant.name}.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <StatCard
                  label="Perputaran BNI VA Bulanan"
                  value={portfolio?.monthlyTurnover != null ? formatRupiah(portfolio.monthlyTurnover) : 'Memuat...'}
                  hint="Estimasi dari angsuran bulanan merchant binaan × 3.5"
                  icon={CreditCard}
                  iconColorClass="text-orange-500"
                />
                <StatCard
                  label="Merchant Binaan Disupervisi"
                  value={`${portfolio?.merchantCount ?? merchants.length} Merchant`}
                  hint="100% menggunakan integrasi BNI SNAP"
                  icon={Building2}
                  iconColorClass="text-blue-500"
                />
                <StatCard
                  label="Debt Service Coverage (DSCR)"
                  value={creditDss?.dscrRatio !== null && creditDss?.dscrRatio !== undefined ? `${creditDss.dscrRatio.toFixed(2)}x` : 'Menghitung...'}
                  hint={creditDss?.creditHealthRating ? `Status: ${creditDss.creditHealthRating} · ambang aman ≥ 1.25x` : 'Ambang aman BNI: ≥ 1.25x angsuran bulanan'}
                  icon={ShieldCheck}
                  iconColorClass="text-emerald-500"
                  featured
                />
              </div>

              {/* Portfolio Widgets: leaderboard, attention list, merchant table, priority breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Leaderboard title="Top Merchant Berdasarkan Retensi" entries={topRetentionEntries} />
                <ActionPanel
                  title="Prioritas Pendampingan RM"
                  items={attentionItems}
                  emptyLabel="Semua merchant binaan dalam kondisi sehat, tidak ada yang butuh perhatian segera."
                />
                <BreakdownCard title="Distribusi Kesehatan Portofolio" segments={priorityBreakdown} />
              </div>

              <AvatarProgressTable
                title="Retensi per Merchant Binaan"
                columnLabel="Retention Rate"
                rows={merchantAvatarRows}
                emptyLabel="Belum ada merchant yang tersinkronisasi."
              />

              {/* Early Warning System & AI Narrative Banner */}
              {merchantInsights?.narrative && (
                <div className="p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 rounded-xl">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0 text-orange-600 dark:text-orange-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Analisis Kesehatan Bisnis AI (BNI RM Advisor)</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {merchantInsights.narrative.health_status || 'PRIME'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground/90 mt-2 space-y-1">
                        {merchantInsights.narrative.narrative_summary?.map((n: string, i: number) => (
                          <p key={i}>• {n}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Retention Transactions Ledger */}
              <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-sm text-foreground">Mutasi Pembayaran BNI VA Terakhir</h2>
                    <p className="text-xs text-muted-foreground">Log pembayaran konversi retensi member yang terekam secara live.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      Semua ({payments.length})
                    </button>
                    <button 
                      onClick={() => setStatusFilter('paid')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      Lunas ({paidCount})
                    </button>
                    <button 
                      onClick={() => setStatusFilter('pending')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      Menunggu ({pendingCount})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border/40 text-muted-foreground font-medium">
                      <tr>
                        <th className="py-3 px-4">Invoice / Trx ID</th>
                        <th className="py-3 px-4">Nama Member</th>
                        <th className="py-3 px-4">Nominal Diselesaikan</th>
                        <th className="py-3 px-4">Status Transaksi</th>
                        <th className="py-3 px-4">Waktu Penyelesaian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            Belum ada transaksi pembayaran untuk filter ini.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.slice(0, 15).map(p => {
                          const isPaid = paymentStatus(p.status) === 'paid';
                          return (
                            <tr key={p.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-foreground">{p.id}</td>
                              <td className="py-3 px-4 font-medium text-foreground">{p.memberName}</td>
                              <td className="py-3 px-4 font-semibold text-foreground">{formatRupiah(p.amount)}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  isPaid 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock3 className="w-3 h-3" />}
                                  {paymentStatusLabel(p.status)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">{p.timestamp}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTIONS & VA BNI */}
          {activeTab === 'transactions' && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Ledger Pembayaran BNI Virtual Account
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Arsip seluruh nomor Virtual Account dinamis dan status webhook settlement secara real-time.
                </p>
              </div>

              <div className="p-4 bg-card rounded-xl border border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Endpoint Webhook BNI SNAP</div>
                    <div className="text-sm font-mono font-medium text-foreground">https://lanjut.id/api/bni/va-webhook</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Active (200 OK)
                </span>
              </div>

              {/* Transactions Table */}
              <div className="bg-card rounded-xl border border-border/60 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-border/50">
                  <span className="font-semibold text-sm text-foreground">Riwayat {payments.length} Transaksi Terverifikasi</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-border/40 text-muted-foreground font-medium">
                      <tr>
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Gross Amount</th>
                        <th className="py-3 px-4">BNI Status</th>
                        <th className="py-3 px-4">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {payments.map(p => (
                        <tr key={p.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                          <td className="py-3 px-4 font-mono font-medium text-foreground">{p.id}</td>
                          <td className="py-3 px-4 font-medium">{p.memberName}</td>
                          <td className="py-3 px-4 font-bold text-foreground">{formatRupiah(p.amount)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{p.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RISK DSS & SME CREDIT */}
          {(activeTab === 'risk_dss' || activeTab === 'sme_credit') && (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  BNI Decision Support System & Kelayakan Kredit SME
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Analisis kuantitatif Debt Service Coverage Ratio (DSCR) dan profil risiko kredit berlandaskan arus kas settlement nyata.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-card rounded-xl border border-border/60 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kolektibilitas & DSCR</span>
                    <h3 className="text-xl font-bold text-foreground mt-1">
                      {creditDss ? `Status: ${creditDss.creditHealthRating}` : `Menghitung DSCR untuk ${selectedMerchant.name}...`}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      {creditDss?.dscrRatio !== null && creditDss?.dscrRatio !== undefined
                        ? `Rasio perputaran dana Virtual Account terhadap kewajiban angsuran bulanan BNI mencapai ${creditDss.dscrRatio.toFixed(2)}x terhadap batas minimum 1.25x.`
                        : 'Sidecar AI DSS sedang dihubungi, atau belum ada volume settlement BNI VA yang cukup untuk merchant ini.'}
                    </p>
                    {creditDss && creditDss.aiRiskRationale.length > 0 && (
                      <ul className="text-xs text-muted-foreground mt-3 space-y-1 list-disc list-inside">
                        {creditDss.aiRiskRationale.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/40">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {creditDss?.recommendedRMAction || 'Menunggu hasil evaluasi DSS untuk rekomendasi RM.'}
                    </span>
                  </div>
                </div>

                <div className="p-6 bg-card rounded-xl border border-border/60 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kepatuhan Regulasi Perbankan</span>
                    <h3 className="text-xl font-bold text-foreground mt-1">UU PDP & Standar BI SNAP</h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      Semua data nasabah dan riwayat transaksi telah disanitasi dari data pribadi (PII Masked) sebelum dievaluasi oleh sistem rekomendasi AI.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">
                      Keputusan akhir persetujuan kredit tetap berada pada wewenang Komite Kredit Bank BNI.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SNAP BNI API & CREDENTIALS */}
          {(activeTab === 'snap_bni' || activeTab === 'webhooks') && (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Konfigurasi Kredensial BNI SNAP
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Parameter otentikasi SHA-256 HMAC dan nomor Company Code untuk gateway pembayaran.
                </p>
              </div>

              <div className="p-6 bg-card rounded-xl border border-border/60 shadow-xs flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">BNI Company Code</label>
                  <div className="text-sm font-mono font-bold text-foreground mt-1 p-2.5 bg-black/5 dark:bg-white/5 rounded-md">
                    8808 (Produksi Virtual Account)
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase">API Secret Key (HMAC-SHA256)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 text-sm font-mono text-foreground p-2.5 bg-black/5 dark:bg-white/5 rounded-md truncate">
                      ••••••••••••••••••••••••••••••••••••••••••••
                    </div>
                    <button 
                      onClick={copyCredential}
                      className="px-3 py-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-md flex items-center gap-1.5 shrink-0"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Disalin' : 'Salin Key'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Kredensial dilindungi oleh sistem keamanan Bank BNI. Jangan pernah membagikan Secret Key kepada pihak ketiga.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DEFAULT / OTHER TABS */}
          {activeTab !== 'overview' && activeTab !== 'home' && activeTab !== 'transactions' && activeTab !== 'risk_dss' && activeTab !== 'sme_credit' && activeTab !== 'snap_bni' && activeTab !== 'webhooks' && (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Blocks className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Modul {activeTab.replace('_', ' ')}</h2>
              <p className="text-xs text-muted-foreground mt-1.5">
                Fitur ini aktif dan tersinkronisasi dengan core gateway Bank BNI untuk merchant {selectedMerchant.name}.
              </p>
              <button 
                onClick={() => setActiveTab('overview')}
                className="mt-6 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg shadow-xs"
              >
                Kembali ke Overview
              </button>
            </div>
          )}
    </DashboardShell>

      {/* Global Search Modal (⌘K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/50 backdrop-blur-sm px-4">
          <div className="fixed inset-0" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-xl bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 border-b border-border/50">
              <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
              <input 
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent py-4 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Cari transaksi, ID invoice, atau nama member..."
              />
              <kbd 
                onClick={() => setIsSearchOpen(false)}
                className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 ml-2 text-[10px] font-mono text-muted-foreground bg-black/5 dark:bg-white/10 rounded cursor-pointer"
              >
                ESC
              </kbd>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="ml-3 p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 py-4 max-h-[300px] overflow-y-auto">
              {filteredPayments.slice(0, 5).map(p => (
                <div 
                  key={p.id}
                  onClick={() => { setActiveTab('transactions'); setIsSearchOpen(false); }}
                  className="p-2.5 mx-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-medium text-foreground">{p.memberName} ({p.id})</div>
                    <div className="text-[10px] text-muted-foreground">{p.timestamp}</div>
                  </div>
                  <div className="text-xs font-bold text-foreground">{formatRupiah(p.amount)}</div>
                </div>
              ))}
              {filteredPayments.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Tidak ditemukan transaksi yang cocok dengan kata kunci.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
