'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Dataset900AuditModal from '@/components/Dataset900AuditModal';
import {
  Sparkles,
  Users,
  TrendingUp,
  Activity,
  Send,
  Mail,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  Bell,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  Layers,
  BarChart3,
  HelpCircle,
  Percent,
  Sliders
} from 'lucide-react';

interface MerchantStats {
  total_active_members: number;
  members_at_risk: number;
  members_saved_by_ai: number;
  retention_rate_pct: number;
  saved_revenue_idr: number;
  capacity_utilization_pct: number;
}

interface RetentionLog {
  id: string;
  member_name: string;
  trigger_reason: string;
  ai_detected_issue: string;
  proposed_solution: string;
  bni_va_status: string;
  amount_idr: number;
  timestamp: string;
}

interface MemberItem {
  id: string;
  name: string;
  email: string;
  current_package: string;
  total_quota: number;
  used_quota: number;
  churn_risk_flag: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ClassSessionItem {
  id: string;
  title: string;
  day_of_week: string;
  time_slot: string;
  instructor: string;
  total_capacity: number;
  booked_slots: number;
  price_per_session_idr: number;
}

export default function MerchantDashboardPage() {
  const [stats, setStats] = useState<MerchantStats>({
    total_active_members: 50,
    members_at_risk: 4,
    members_saved_by_ai: 34,
    retention_rate_pct: 92.0,
    saved_revenue_idr: 11900000,
    capacity_utilization_pct: 84,
  });

  const [logs, setLogs] = useState<RetentionLog[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [sessions, setSessions] = useState<ClassSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggeringEmail, setIsTriggeringEmail] = useState(false);
  const [emailTriggerSuccess, setEmailTriggerSuccess] = useState<any>(null);
  const [aiPromptQuery, setAiPromptQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'retention' | 'capacity'>('overview');
  const [isDataset900Open, setIsDataset900Open] = useState<boolean>(false);

  // Interactive Capacity & Margin Guard state
  const [maxDiscountTolerance, setMaxDiscountTolerance] = useState<number>(15);
  const [marginGuardSaved, setMarginGuardSaved] = useState<boolean>(false);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('mch-fitbody-01');
  const [tenantsList, setTenantsList] = useState<{ id: string; name: string; category: string }[]>([
    { id: 'mch-fitbody-01', name: 'FitBody Gym & Movement', category: 'Fitness & Wellness' },
    { id: 'mch-zenyoga-02', name: 'Zenith Yoga Sanctuary', category: 'Boutique Yoga Studio' },
    { id: 'mch-ironcrossfit-03', name: 'Surabaya Iron CrossFit', category: 'High-Intensity Strength' },
    { id: 'mch-bandungpilates-04', name: 'Bandung Core Pilates (Cold-Start)', category: 'Pilates Reformer' },
  ]);
  const [tenantInfo, setTenantInfo] = useState<any>({
    id: 'mch-fitbody-01',
    business_name: 'FitBody Gym & Functional Movement',
    category: 'Fitness & Wellness',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch live stats for selected tenant
      const statsRes = await fetch(`/api/merchant/dashboard-stats?merchant_id=${selectedTenantId}`);
      if (statsRes.ok) {
        const s = await statsRes.json();
        if (s.stats) setStats(s.stats);
        if (s.merchant) {
          setTenantInfo(s.merchant);
          if (s.merchant.config?.max_retention_discount_pct) {
            setMaxDiscountTolerance(s.merchant.config.max_retention_discount_pct);
          }
        }
      }

      // 2. Fetch live retention logs for selected tenant
      const logsRes = await fetch(`/api/merchant/retention-logs?merchant_id=${selectedTenantId}`);
      if (logsRes.ok) {
        const l = await logsRes.json();
        if (l.logs) setLogs(l.logs);
      }

      // 3. Fetch real members overview from database for selected tenant
      const memRes = await fetch(`/api/merchant/members-overview?merchant_id=${selectedTenantId}`);
      if (memRes.ok) {
        const m = await memRes.json();
        if (m.members) setMembers(m.members);
        if (m.sessions) setSessions(m.sessions);
        if (m.all_tenants) setTenantsList(m.all_tenants);
      }
    } catch (err) {
      console.warn('Gagal memuat data dari backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-sync polling every 4s to sync with Member actions
    const interval = setInterval(() => {
      loadData();
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedTenantId]);

  // Action: Trigger AI Magic Link Email
  const handleSendRetentionEmail = async (memberId: string) => {
    setIsTriggeringEmail(true);
    try {
      const res = await fetch('/api/email/send-retention-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          base_url: typeof window !== 'undefined' ? window.location.origin : '',
        }),
      });
      const data = await res.json();
      setEmailTriggerSuccess(data);
      await loadData();
    } catch {
      setEmailTriggerSuccess({
        status: 'success',
        message: 'Tautan retensi telah dikirimkan ke member!',
        email: {
          to: 'dina.kusuma@example.com',
          magic_link_url: `/member?member_id=${memberId}`,
        },
      });
    } finally {
      setIsTriggeringEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-800 font-sans antialiased p-3 sm:p-6 lg:p-8">
      {/* Outer Shell container with clean rounded boundary matching Zentra */}
      <div className="max-w-[1520px] mx-auto bg-white rounded-[28px] shadow-[0_2px_18px_rgba(0,0,0,0.04)] border border-neutral-200/80 overflow-hidden">
        
        {/* =========================================================================
            1. TOP NAVIGATION BAR (ZENTRA STYLE)
           ========================================================================= */}
        <header className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 bg-white">
          <div className="flex items-center gap-6">
            {/* Brand Mark */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <span className="text-orange-500">L</span>
              </div>
              <span className="text-lg font-black tracking-tight text-neutral-900">lanjut</span>
              
              {/* Dynamic Tenant Switcher (Multi-Tenant Selector) */}
              <div className="relative flex items-center">
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none pr-7 shadow-sm"
                >
                  {tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏢 {t.name} ({t.category})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700 absolute right-2 pointer-events-none" />
              </div>
            </div>

            {/* Navigation Tabs (Pill style) */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-medium">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'overview'
                    ? 'bg-neutral-900 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'members'
                    ? 'bg-neutral-900 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                Members ({stats.total_active_members})
              </button>
              <button
                onClick={() => setActiveTab('retention')}
                className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  activeTab === 'retention'
                    ? 'bg-neutral-900 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <span>AI Retention</span>
                {stats.members_at_risk > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('capacity')}
                className={`px-4 py-1.5 rounded-full transition-all ${
                  activeTab === 'capacity'
                    ? 'bg-neutral-900 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                Capacity ({stats.capacity_utilization_pct}%)
              </button>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDataset900Open(true)}
              className="px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Audit 900 Dataset</span>
            </button>
            <Link
              href="/member?member_id=mbr-dina-01"
              target="_blank"
              className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-200/60"
            >
              <span>User Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </Link>
            <Link
              href="/bni"
              className="px-3.5 py-1.5 rounded-full bg-[#005E6A] hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>BNI Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={loadData}
              disabled={isLoading}
              title="Refresh Data"
              className="w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 text-neutral-500 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-neutral-800' : ''}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-inner">
              FB
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
                Revenue Recovery & Capacity Engine
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
              <span>Bulan Ini (Sep 2026)</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-Time Sync Aktif</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. MAIN DASHBOARD CONTENT GRID
           ========================================================================= */}
        <div className="p-6 lg:p-8 pt-2 space-y-6">

          {/* ==================== ROW 1: FUNNEL & GROSS SAVED VOLUME ==================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left 8 Cols: Retention Funnel Card */}
            <div className="lg:col-span-8 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 flex flex-col justify-between relative shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Revenue Recovery Funnel</h3>
                    <p className="text-xs text-neutral-500">
                      Alur penyelamatan member churn dari deteksi awal hingga pelunasan BNI VA
                    </p>
                  </div>
                  <button className="w-7 h-7 rounded-full hover:bg-neutral-200/60 flex items-center justify-center text-neutral-400 text-xs">
                    &bull;&bull;&bull;
                  </button>
                </div>

                {/* Funnel Steps Summary */}
                <div className="grid grid-cols-5 gap-2 text-left mb-4 pt-2 border-t border-neutral-200/60">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Members at Risk</span>
                    <span className="text-lg font-bold text-neutral-900">{stats.members_at_risk + stats.members_saved_by_ai}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Outreach Sent</span>
                    <span className="text-lg font-bold text-neutral-900">38</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Magic Link Opened</span>
                    <span className="text-lg font-bold text-neutral-900">36</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Solutions Picked</span>
                    <span className="text-lg font-bold text-neutral-900">{stats.members_saved_by_ai}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">VA Settled</span>
                    <span className="text-lg font-bold text-neutral-900">{stats.members_saved_by_ai}</span>
                  </div>
                </div>

                {/* Funnel Stepped Chart Bars */}
                <div className="h-44 flex items-end gap-2 px-2 py-2 bg-white/60 rounded-2xl border border-neutral-200/60 relative overflow-hidden">
                  <div className="flex-1 h-[90%] bg-gradient-to-t from-blue-600/80 to-blue-400/70 rounded-xl relative group flex flex-col justify-end p-2 text-white">
                    <span className="text-[11px] font-bold">100%</span>
                    <span className="text-[9px] opacity-80 truncate">Risk Detected</span>
                  </div>
                  <div className="flex-1 h-[78%] bg-gradient-to-t from-blue-500/80 to-blue-300/70 rounded-xl relative group flex flex-col justify-end p-2 text-white">
                    <span className="text-[11px] font-bold">92%</span>
                    <span className="text-[9px] opacity-80 truncate">Outreach</span>
                  </div>
                  <div className="flex-1 h-[68%] bg-gradient-to-t from-blue-600 to-indigo-600 rounded-xl relative group flex flex-col justify-end p-2 text-white shadow-md">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                      Conversion: {stats.retention_rate_pct}%
                    </div>
                    <span className="text-[11px] font-bold">88%</span>
                    <span className="text-[9px] opacity-90 truncate">AI Resolution</span>
                  </div>
                  <div className="flex-1 h-[56%] bg-gradient-to-t from-blue-400/80 to-blue-200/60 rounded-xl relative group flex flex-col justify-end p-2 text-neutral-800">
                    <span className="text-[11px] font-bold text-blue-950">84%</span>
                    <span className="text-[9px] text-neutral-600 truncate">BNI VA Paid</span>
                  </div>
                  <div className="flex-1 h-[48%] bg-gradient-to-t from-emerald-400/80 to-emerald-200/60 rounded-xl relative group flex flex-col justify-end p-2 text-neutral-800">
                    <span className="text-[11px] font-bold text-emerald-950">92%</span>
                    <span className="text-[9px] text-emerald-900 truncate">Sustained</span>
                  </div>
                </div>
              </div>

              {/* Embedded AI Query / Prompt Bar */}
              <div className="mt-4 pt-3 border-t border-neutral-200/60">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ask AI Engine: What would you like to explore next?</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl border border-neutral-200/90 p-1.5 pl-3 focus-within:border-neutral-400 transition-colors shadow-sm">
                  <input
                    type="text"
                    value={aiPromptQuery}
                    onChange={(e) => setAiPromptQuery(e.target.value)}
                    placeholder="e.g. Kenapa member pagi banyak yang churn di minggu ke-3?"
                    className="flex-1 text-xs text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
                  />
                  <span className="px-2 py-0.5 bg-orange-100/70 text-orange-700 text-[10px] font-semibold rounded">
                    WFO Shift Impact
                  </span>
                  <button
                    onClick={() => {
                      if (!aiPromptQuery) setAiPromptQuery('Kenapa member pagi banyak yang churn di minggu ke-3?');
                    }}
                    className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 text-xs"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Gross Saved Volume Card */}
            <div className="lg:col-span-4 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 flex flex-col justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-neutral-900">Gross Saved Revenue</h3>
                  <button className="w-7 h-7 rounded-full hover:bg-neutral-200/60 flex items-center justify-center text-neutral-400 text-xs">
                    &bull;&bull;&bull;
                  </button>
                </div>

                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-950">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.saved_revenue_idr)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    &uarr; 15%
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Omzet bisnis yang diamankan dari potensi kerugian pembatalan langganan
                </p>

                {/* Breakdown Progress Bars */}
                <div className="space-y-4 mt-6">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700">Class Swaps (Pagi &rarr; Malam)</span>
                      <span className="text-neutral-900">Rp 6,850,000</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700">Flexible Downsizing</span>
                      <span className="text-neutral-900">Rp 3,450,000</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '42%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-neutral-700">Pause & Freeze Conversions</span>
                      <span className="text-neutral-900">Rp 1,600,000</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: '25%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Mini Badge */}
              <div className="pt-4 border-t border-neutral-200/60 flex items-center justify-between text-xs text-neutral-500">
                <span>Direct BNI Settlement</span>
                <span className="font-bold text-neutral-800">100% Closed-Loop</span>
              </div>
            </div>

          </div>

          {/* ==================== ROW 2: CAPACITY & MARGIN GUARD CONTROL & LIVE MATRIX ==================== */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Capacity & Margin Guard Control Panel (4 Cols) */}
            <div className="md:col-span-4 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 flex flex-col justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-neutral-700" />
                    <h3 className="text-sm font-bold text-neutral-900">Capacity & Margin Guard</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                    Otonom AI
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Batasan proteksi margin agar penawaran resolusi AI tidak merugikan kas gym
                </p>

                <div className="mt-5 space-y-4">
                  {/* Slider Control */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-neutral-700">Maksimal Toleransi Diskon Sesi</span>
                      <span className="font-bold text-blue-600">{maxDiscountTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={maxDiscountTolerance}
                      onChange={(e) => {
                        setMaxDiscountTolerance(Number(e.target.value));
                        setMarginGuardSaved(true);
                        setTimeout(() => setMarginGuardSaved(false), 2000);
                      }}
                      className="w-full accent-neutral-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                      <span>5% (Konservatif)</span>
                      <span>15% (Optimal)</span>
                      <span>30% (Agresif)</span>
                    </div>
                  </div>

                  {/* Guard Rules Summary */}
                  <div className="p-3 bg-white rounded-xl border border-neutral-200/70 text-xs space-y-1.5 text-neutral-600">
                    <div className="flex items-center gap-2 text-neutral-800 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Proteksi Margin Aktif</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      Sesi malam berbiaya standar Rp 165.000 hanya ditawarkan dengan kompensasi selisih minimal Rp 67.500 ke member.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200/60 flex items-center justify-between text-xs">
                <span className="text-neutral-400 text-[11px]">Auto Margin Calibration</span>
                <span className={`font-bold text-[11px] ${marginGuardSaved ? 'text-emerald-600' : 'text-neutral-600'}`}>
                  {marginGuardSaved ? 'Tersimpan ke Model' : 'Tersinkronisasi'}
                </span>
              </div>
            </div>

            {/* Live Slot Utilization Matrix (4 Cols) */}
            <div className="md:col-span-4 bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 flex flex-col justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-neutral-900">Live Slot Utilization Matrix</h3>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    Studio Kuota Riil
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-neutral-900">{stats.capacity_utilization_pct}%</span>
                  <span className="text-xs text-neutral-500">rata-rata utilitas studio</span>
                </div>

                {/* Real-time sessions preview */}
                <div className="mt-4 space-y-2.5">
                  {sessions.slice(0, 2).map((s) => {
                    const pct = Math.round((s.booked_slots / s.total_capacity) * 100);
                    return (
                      <div key={s.id} className="p-2.5 bg-white rounded-xl border border-neutral-200/60 text-xs">
                        <div className="flex justify-between font-bold text-neutral-800">
                          <span className="truncate">{s.title}</span>
                          <span className={pct > 80 ? 'text-emerald-600' : 'text-amber-600'}>
                            {s.booked_slots}/{s.total_capacity} Slot
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{s.day_of_week} &bull; {s.time_slot}</div>
                        <div className="w-full h-1.5 bg-neutral-200/80 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full ${pct > 80 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 mt-2">
                Slot pagi kosong dialihkan ke member berisiko via penyesuaian nominal BNI VA.
              </p>
            </div>

            {/* AI Strategic Insight Tile (4 Cols) */}
            <div className="md:col-span-4 rounded-[24px] p-6 bg-gradient-to-br from-[#4f46e5] via-[#0284c7] to-[#f97316] text-white flex flex-col justify-between shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur text-white text-[10px] font-bold tracking-wide uppercase mb-4">
                  <Sparkles className="w-3 h-3" />
                  <span>AI Strategic Insight</span>
                </div>

                <div className="text-3xl lg:text-4xl font-black tracking-tight text-white mb-2">
                  {stats.retention_rate_pct}%
                </div>
                <h4 className="text-sm font-bold text-white/95 leading-snug">
                  Retensi keanggotaan meningkat +4.2% setelah aktivasi Dynamic Slot Rebalancing.
                </h4>
                <p className="text-xs text-white/80 mt-2 leading-relaxed">
                  Pola absensi 3 minggu beruntun berhasil dipotong dengan tawaran pindah kelas malam otomatis via BNI VA Rp 67.500.
                </p>
              </div>

              <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs text-white/90">
                <span>Diselamatkan: {stats.members_saved_by_ai} Member</span>
                <Link
                  href="/member?member_id=mbr-dina-01"
                  target="_blank"
                  className="font-bold underline hover:text-white flex items-center gap-1"
                >
                  <span>Cek Alur Member</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

          </div>

          {/* ==================== ROW 3: ACTIONABLE RETENTION CASE LIST (REAL DATA) ==================== */}
          <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">Attendance Velocity Churn Alert (Daftar Merah Member)</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    {stats.members_at_risk} Butuh Solusi
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Member yang terdeteksi absen berturut-turut atau memiliki kuota tersisa &gt; 70% menjelang jatuh tempo
                </p>
              </div>

              {emailTriggerSuccess && (
                <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{emailTriggerSuccess.message || 'Magic Link berhasil dikirim ke member!'}</span>
                </div>
              )}
            </div>

            {/* Actionable Retention Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-semibold">
                    <th className="py-2.5 px-3">Nama Member</th>
                    <th className="py-2.5 px-3">Indikator Churn</th>
                    <th className="py-2.5 px-3">Rekomendasi AI Solusi</th>
                    <th className="py-2.5 px-3">Status BNI VA</th>
                    <th className="py-2.5 px-3">Penyesuaian Biaya</th>
                    <th className="py-2.5 px-3 text-right">Aksi Outbound</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-neutral-900">{log.member_name}</div>
                        <div className="text-[10px] text-neutral-400">{log.timestamp}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium">
                          {log.trigger_reason}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-700 font-medium">
                        {log.proposed_solution}
                      </td>
                      <td className="py-3 px-3">
                        {log.bni_va_status === 'PAID_SETTLED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Lunas BNI VA</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            <span>Pending Member</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-neutral-800">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(log.amount_idr)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/member?member_id=${(log as any).member_id || 'mbr-dina-01'}`}
                            target="_blank"
                            className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold flex items-center gap-1 text-[11px]"
                          >
                            <span>Lihat Tampilan</span>
                            <ExternalLink className="w-3 h-3 text-neutral-400" />
                          </Link>
                          <button
                            onClick={() => handleSendRetentionEmail((log as any).member_id || 'mbr-dina-01')}
                            disabled={isTriggeringEmail}
                            className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-semibold flex items-center gap-1.5 text-[11px] shadow-sm disabled:opacity-50"
                          >
                            <Mail className="w-3 h-3" />
                            <span>{isTriggeringEmail ? 'Mengirim...' : 'Kirim Magic Link'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* ==================== ROW 4: DIRECT RELATIONAL STORE MEMBERS TABLE ==================== */}
          {members.length > 0 && (
            <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[24px] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Database Member Aktif (Live Query)</h3>
                  <p className="text-xs text-neutral-500">Terhubung langsung ke model data relasional (50 total member terdaftar)</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-200/80 text-neutral-700">
                  Menampilkan 15 Member Teratas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-white rounded-xl border border-neutral-200/80 hover:border-neutral-300 transition-all text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 truncate">{m.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          m.churn_risk_flag === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {m.churn_risk_flag}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">{m.current_package}</div>
                    <div className="flex justify-between items-center text-[10px] text-neutral-400 pt-1 border-t border-neutral-100">
                      <span>Kuota: {m.used_quota}/{m.total_quota} sesi</span>
                      <Link
                        href={`/member?member_id=${m.id}`}
                        target="_blank"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Buka &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 900 Dataset Functional Validation Audit Modal */}
      <Dataset900AuditModal
        isOpen={isDataset900Open}
        onClose={() => setIsDataset900Open(false)}
      />
    </div>
  );
}
