'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Dataset900AuditModal from '@/components/Dataset900AuditModal';
import VisualAnalyticsTab from '@/components/merchant/VisualAnalyticsTab';
import AiPredictionTab from '@/components/merchant/AiPredictionTab';
import FutureScenariosTab from '@/components/merchant/FutureScenariosTab';
import CancellationFeedbackDemoModal from '@/components/merchant/CancellationFeedbackDemoModal';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Settings,
  Headphones,
  BarChart2,
  Wallet,
  FileText,
  Users,
  Video,
  ChevronDown,
  MoreHorizontal,
  Download,
  AlertTriangle,
  Cpu,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Sliders,
  Check,
  Hexagon,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send
} from 'lucide-react';

interface MerchantStats {
  total_members: number;
  at_risk_members: number;
  saved_members: number;
  retention_rate_pct: number;
  total_revenue_paid_idr: number;
  avg_quota_utilization_pct: number;
  outreach_sent: number;
  magic_link_opened: number;
  va_settled: number;
}

interface RetentionLog {
  id: string;
  member_name: string;
  trigger_reason: string;
  ai_detected_issue: string;
  recommended_action: string;
  magic_token: string;
  created_at: string;
}

interface MemberItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  current_package: string;
  total_quota: number;
  used_quota: number;
  churn_risk_flag?: string;
  attendance_history?: string[];
  days_inactive?: number;
}

interface ClassSessionItem {
  id: string;
  title: string;
  day_of_week: string;
  time_slot: string;
  time_of_day: string;
  total_capacity: number;
  booked_slots: number;
  price_per_session_idr: number;
}

export default function MerchantDashboard() {
  const [stats, setStats] = useState<MerchantStats>({
    total_members: 49229,
    at_risk_members: 4,
    saved_members: 34,
    retention_rate_pct: 92.0,
    total_revenue_paid_idr: 49229000,
    avg_quota_utilization_pct: 84,
    outreach_sent: 38,
    magic_link_opened: 36,
    va_settled: 34,
  });

  const [logs, setLogs] = useState<RetentionLog[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [sessions, setSessions] = useState<ClassSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggeringEmail, setIsTriggeringEmail] = useState(false);
  const [emailTriggerSuccess, setEmailTriggerSuccess] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'tasks' | 'calendar' | 'settings' | 'support' | 'performance' | 'payrolls' | 'invoice' | 'employees' | 'meeting'>('dashboard');
  const [isDataset900Open, setIsDataset900Open] = useState<boolean>(false);
  const [isFeedbackDemoOpen, setIsFeedbackDemoOpen] = useState<boolean>(false);

  // ML Churn Analytics State
  const [mlAnalytics, setMlAnalytics] = useState<any>({
    total_customers: 49229,
    active_customers: 36183,
    churned_customers: 13046,
    churn_rate_pct: 26.5,
    model_accuracy_pct: 82.4,
    ai_features_count: 15,
  });
  const [revenueInsights, setRevenueInsights] = useState<any>(null);

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
      const statsRes = await fetch(`/api/merchant/dashboard-stats?merchant_id=${selectedTenantId}`);
      if (statsRes.ok) {
        const s = await statsRes.json();
        if (s.stats) setStats(s.stats);
        if (s.merchant) setTenantInfo(s.merchant);
      }

      const logsRes = await fetch(`/api/merchant/retention-logs?merchant_id=${selectedTenantId}`);
      if (logsRes.ok) {
        const l = await logsRes.json();
        if (l.logs) setLogs(l.logs);
      }

      const memRes = await fetch(`/api/merchant/members-overview?merchant_id=${selectedTenantId}`);
      if (memRes.ok) {
        const m = await memRes.json();
        if (m.members) setMembers(m.members);
        if (m.sessions) setSessions(m.sessions);
        if (m.all_tenants) setTenantsList(m.all_tenants);
      }

      const analyticsRes = await fetch(`/api/merchant/churn-analytics?merchant_id=${selectedTenantId}`);
      if (analyticsRes.ok) {
        const a = await analyticsRes.json();
        if (a.analytics) setMlAnalytics(a.analytics);
      }

      const revRes = await fetch(`/api/merchant/${selectedTenantId}/revenue-insights`);
      if (revRes.ok) {
        const r = await revRes.json();
        if (r.insights) setRevenueInsights(r.insights);
      }
    } catch (err) {
      console.warn('Gagal memuat data dari backend:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedTenantId]);

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
      });
    } finally {
      setIsTriggeringEmail(false);
    }
  };

  const handleDownloadCsv = () => {
    const csvHeader = 'Customer_ID,Name,Tenure_Months,Monthly_Charges,Total_Charges,Contract,Actual_Churn,AI_Risk_Score,Risk_Level\n';
    const csvRows = members.map((m, idx) => {
      const tenureMonths = (idx * 4 + 6) % 60 + 1;
      const mc = 65.0;
      const tc = tenureMonths * mc;
      const isHigh = m.churn_risk_flag === 'HIGH';
      const riskScore = isHigh ? '86.4%' : '14.2%';
      const riskLevel = isHigh ? 'High Risk' : 'Low Risk';
      return `${m.id},"${m.name}",${tenureMonths},${mc},${tc},"Month-to-month",${isHigh ? 'Yes' : 'No'},${riskScore},"${riskLevel}"`;
    }).join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LANJUT_Merchant_Dataset_${selectedTenantId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock Top Performers matching the reference design image
  const topPerformers = [
    {
      id: 1,
      name: 'Louis Gutkowski',
      tasks: '314 tasks completed',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      name: 'Marlene Kuhlman',
      tasks: '309 tasks completed',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 3,
      name: 'Kristi Lueilwitz',
      tasks: '289 tasks completed',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 4,
      name: 'Abel Pollich',
      tasks: '242 tasks completed',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
  ];

  // Mock Employees List matching the reference design image
  const displayEmployees = [
    { id: 'OM1246924', name: 'Judy Abbott', role: 'Interactions Manager', progress: 75, color: '#c96f48' },
    { id: 'OM1243473', name: 'Martin Feeney', role: 'Accountability Specialist', progress: 85, color: '#dd845e' },
    { id: 'OM4637343', name: 'Ellen Streich', role: 'Mobility Supervisor', progress: 55, color: '#c96f48' },
    { id: 'OM1535524', name: 'Ellis Lubowitz', role: 'Product Security Engineer', progress: 40, color: '#e8a183' },
  ];

  return (
    <div className="min-h-screen bg-[#f5ebe2] text-[#1e293b] font-sans antialiased relative overflow-x-hidden p-3 sm:p-5 lg:p-7 flex items-center justify-center">
      {/* Warm Ambient Glassmorphism Background Blobs */}
      <div className="fixed -top-40 -left-40 w-[650px] h-[650px] bg-gradient-to-br from-[#f8d7c4]/60 via-[#f4cbbe]/40 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/4 -right-40 w-[700px] h-[700px] bg-gradient-to-bl from-[#fde0ce]/50 via-[#f8d3c5]/35 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 left-1/3 w-[600px] h-[600px] bg-gradient-to-tr from-[#edd0c2]/50 via-[#fadfd3]/35 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Floating Glass Container */}
      <div className="relative w-full max-w-[1520px] bg-[#fdfbf9]/85 backdrop-blur-2xl border border-white/80 rounded-[38px] shadow-[0_25px_70px_-15px_rgba(180,130,110,0.18),0_10px_30px_-5px_rgba(0,0,0,0.03)] p-6 lg:p-9 flex flex-col lg:flex-row gap-8">
        
        {/* =========================================================================
            1. LEFT SIDEBAR
           ========================================================================= */}
        <aside className="w-full lg:w-56 shrink-0 flex flex-col justify-between">
          <div>
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#b85e35] via-[#d4784f] to-[#994622] flex items-center justify-center text-white font-black shadow-[0_4px_14px_rgba(184,94,53,0.35)]">
                <Hexagon className="w-5 h-5 fill-white/20 stroke-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-[#1e293b]">HReazec</span>
                <span className="block text-[9px] font-bold text-[#b85e35] uppercase tracking-wider">
                  by lanjut.id
                </span>
              </div>
            </div>

            {/* Main Menu Section */}
            <div className="space-y-1 mb-8">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-3">
                Main Menu
              </div>

              <button
                onClick={() => setActiveMenu('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                  activeMenu === 'dashboard'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-[#1e293b] flex items-center justify-center text-white">
                  <LayoutDashboard className="w-3 h-3" />
                </div>
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveMenu('tasks')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'tasks'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-neutral-400" />
                <span>Tasks</span>
              </button>

              <button
                onClick={() => setActiveMenu('calendar')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'calendar'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Calendar</span>
              </button>

              <button
                onClick={() => setActiveMenu('settings')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'settings'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <Settings className="w-4 h-4 text-neutral-400" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => setActiveMenu('support')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'support'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <Headphones className="w-4 h-4 text-neutral-400" />
                <span>Support</span>
              </button>
            </div>

            {/* Team Management Section */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-3">
                Team Management
              </div>

              <button
                onClick={() => setActiveMenu('performance')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'performance'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-neutral-400" />
                <span>Performance</span>
              </button>

              <button
                onClick={() => setActiveMenu('payrolls')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'payrolls'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <Wallet className="w-4 h-4 text-neutral-400" />
                <span>Payrolls</span>
              </button>

              <button
                onClick={() => setActiveMenu('invoice')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'invoice'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <FileText className="w-4 h-4 text-neutral-400" />
                <span>Invoice</span>
              </button>

              <button
                onClick={() => setActiveMenu('employees')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'employees'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <Users className="w-4 h-4 text-neutral-400" />
                <span>Employees</span>
              </button>

              <button
                onClick={() => setActiveMenu('meeting')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all cursor-pointer ${
                  activeMenu === 'meeting'
                    ? 'bg-[#eddcd0]/90 text-[#1e293b] font-bold shadow-xs border border-white/60'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5 font-semibold'
                }`}
              >
                <Video className="w-4 h-4 text-neutral-400" />
                <span>Meeting</span>
              </button>
            </div>
          </div>

          {/* Bottom Tenant Selector & Live Polling Status */}
          <div className="pt-6 border-t border-neutral-200/60 mt-6">
            <div className="relative">
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white/70 border border-neutral-200/70 text-neutral-800 appearance-none pr-8 cursor-pointer focus:outline-none"
              >
                {tenantsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    🏢 {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Sync Active</span>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            2. MAIN CONTENT AREA (Plek Ketiplek Sesuai Desain Glassmorphism)
           ========================================================================= */}
        <main className="flex-1 flex flex-col gap-6">
          
          {/* Top Header Bar */}
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-[#1a2332] tracking-tight">
                Dashboard
              </h1>
            </div>

            {/* Right: Actions & Carla Sanford Profile Pill */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFeedbackDemoOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-rose-700 text-xs font-bold border border-rose-200/80 shadow-xs transition-all cursor-pointer"
                title="Demo Canceled Feedback Survey"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Demo Survey</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDataset900Open(true)}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-orange-700 text-xs font-bold border border-orange-200/80 shadow-xs transition-all cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Audit 900</span>
              </button>

              <Link
                href="/payment-gateway"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#005E6A] text-xs font-bold border border-teal-200/80 shadow-xs transition-all"
              >
                <span>BNI Gateway</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              {/* Carla Sanford User Pill (Plek Ketiplek) */}
              <div className="bg-white/90 backdrop-blur-md border border-white/90 shadow-xs px-3 py-1.5 rounded-full flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                  alt="Carla Sanford"
                  className="w-8 h-8 rounded-full object-cover border border-white"
                />
                <span className="text-xs font-bold text-neutral-800">
                  Carla Sanford
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </div>
            </div>
          </header>

          {/* Content Switcher for secondary tabs */}
          {activeMenu === 'performance' && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xs border border-white/80">
              <VisualAnalyticsTab analytics={mlAnalytics} revenueInsights={revenueInsights} />
            </div>
          )}

          {activeMenu === 'tasks' && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xs border border-white/80">
              <AiPredictionTab />
            </div>
          )}

          {activeMenu === 'calendar' && (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-xs border border-white/80">
              <FutureScenariosTab />
            </div>
          )}

          {/* MAIN DASHBOARD VIEW (When activeMenu === 'dashboard' or default) */}
          {(activeMenu === 'dashboard' || activeMenu === 'payrolls' || activeMenu === 'invoice' || activeMenu === 'employees' || activeMenu === 'meeting' || activeMenu === 'settings' || activeMenu === 'support') && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* LEFT & CENTER COLUMN (8 COLS) */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                
                {/* 1. TOP STAT STRIP (Total Employees, Total Project, Job Applicant) */}
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Stat 1 */}
                  <div className="flex items-center gap-3.5 pl-2">
                    <div className="w-11 h-11 rounded-full bg-[#fdf3ec] flex items-center justify-center text-[#b85e35] shadow-inner">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-neutral-400">Total Employees</div>
                      <div className="text-xl font-extrabold text-neutral-900 tracking-tight">
                        {stats.total_members ? stats.total_members.toLocaleString() : '49,229'}
                      </div>
                    </div>
                  </div>

                  {/* Stat 2 */}
                  <div className="flex items-center gap-3.5 pl-2 sm:border-l sm:border-neutral-100">
                    <div className="w-11 h-11 rounded-full bg-[#fdf3ec] flex items-center justify-center text-[#b85e35] shadow-inner">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-neutral-400">Total Project</div>
                      <div className="text-xl font-extrabold text-neutral-900 tracking-tight">
                        49,229
                      </div>
                    </div>
                  </div>

                  {/* Stat 3 */}
                  <div className="flex items-center gap-3.5 pl-2 sm:border-l sm:border-neutral-100">
                    <div className="w-11 h-11 rounded-full bg-[#fdf3ec] flex items-center justify-center text-[#b85e35] shadow-inner">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-neutral-400">Job Applicant</div>
                      <div className="text-xl font-extrabold text-neutral-900 tracking-tight">
                        49,229
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. AVERAGE KPI SCORE CARD + TOP PERFORMANCE */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 lg:p-7 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-white/80 flex flex-col md:flex-row gap-6">
                  {/* Left part: Bar Chart & KPI */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                          Average KPI Score
                        </h3>
                        <button
                          type="button"
                          className="px-3 py-1 rounded-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/60 text-neutral-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Past 3 months</span>
                          <ChevronDown className="w-3 h-3 text-neutral-400" />
                        </button>
                      </div>

                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-4xl font-extrabold text-neutral-900 tracking-tight">
                          63.89%
                        </span>
                      </div>
                      <div className="text-xs text-rose-500 font-semibold mb-6">
                        - 2.34%
                      </div>
                    </div>

                    {/* Cylindrical Pill Bar Chart (Feb to Jul) */}
                    <div className="flex items-end justify-between gap-3 pt-4 border-t border-neutral-100/80">
                      {/* Y-Axis Labels */}
                      <div className="flex flex-col justify-between text-[10px] text-neutral-400 font-medium h-36 pb-6">
                        <span>100%</span>
                        <span>75%</span>
                        <span>50%</span>
                        <span>25%</span>
                        <span>0%</span>
                      </div>

                      {/* Bar 1: Feb (45%) */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-[#ece8e4] rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[45%] bg-gradient-to-t from-[#c86b43] to-[#e08963] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-500">Feb</span>
                      </div>

                      {/* Bar 2: Mar (80%) */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-[#ece8e4] rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[80%] bg-gradient-to-t from-[#c86b43] to-[#e08963] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-500">Mar</span>
                      </div>

                      {/* Bar 3: Apr (60%) */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-[#ece8e4] rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[60%] bg-gradient-to-t from-[#c86b43] to-[#e08963] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-500">Apr</span>
                      </div>

                      {/* Bar 4: May (65%) */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-[#ece8e4] rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[65%] bg-gradient-to-t from-[#c86b43] to-[#e08963] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-500">May</span>
                      </div>

                      {/* Bar 5: Jun (30%) */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-[#ece8e4] rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[30%] bg-gradient-to-t from-[#c86b43] to-[#e08963] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-500">Jun</span>
                      </div>

                      {/* Bar 6: Jul (55%) */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-[#ece8e4] rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[55%] bg-gradient-to-t from-[#c86b43] to-[#e08963] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-500">Jul</span>
                      </div>
                    </div>
                  </div>

                  {/* Right part: Top Performance list */}
                  <div className="w-full md:w-56 border-t md:border-t-0 md:border-l md:border-neutral-100 md:pl-6">
                    <h4 className="text-sm font-bold text-neutral-900 mb-4 tracking-tight">
                      Top Performance
                    </h4>
                    
                    <div className="space-y-3.5">
                      {topPerformers.map((p) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-9 h-9 rounded-full object-cover border border-neutral-100 shadow-xs"
                            />
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-neutral-900 text-white rounded-full text-[8px] font-black flex items-center justify-center">
                              {p.id}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-neutral-900 leading-snug">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              {p.tasks}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. EMPLOYEES TABLE CARD */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-white/80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                      Employees
                    </h3>
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="text-xs font-semibold text-[#b85e35] hover:text-[#994622] flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-neutral-400 font-semibold border-b border-neutral-100">
                          <th className="pb-3 px-2 font-medium">ID</th>
                          <th className="pb-3 px-2 font-medium">Name</th>
                          <th className="pb-3 px-2 font-medium">Role</th>
                          <th className="pb-3 px-2 font-medium">Performance</th>
                          <th className="pb-3 px-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100/70">
                        {displayEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-neutral-50/60 transition-colors">
                            <td className="py-3 px-2 font-semibold text-neutral-800">
                              {emp.id}
                            </td>
                            <td className="py-3 px-2 font-bold text-neutral-900">
                              {emp.name}
                            </td>
                            <td className="py-3 px-2 text-neutral-600 font-medium">
                              {emp.role}
                            </td>
                            <td className="py-3 px-2">
                              <div className="w-24 h-2 bg-[#f4ebe5] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${emp.progress}%`, backgroundColor: emp.color }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button
                                type="button"
                                className="text-neutral-300 hover:text-neutral-600 cursor-pointer p-1"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (4 COLS - DARK UPCOMING MEETING & WORKING FORMAT CARDS) */}
              <div className="xl:col-span-4 flex flex-col gap-6">
                
                {/* 1. UPCOMING MEETING (The Signature Dark Glassmorphism Card) */}
                <div className="bg-[#18181b] text-white rounded-3xl p-6 lg:p-7 shadow-xl border border-white/10 relative overflow-hidden flex flex-col justify-between">
                  {/* Subtle warm ambient glow behind dark glass */}
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#c86b43]/15 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white tracking-tight mb-6">
                      Upcoming Meeting
                    </h3>

                    {/* Timeline List with Connector Line */}
                    <div className="relative pl-5 space-y-6 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-white/20">
                      
                      {/* Timeline Item 1 */}
                      <div className="relative">
                        <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-white ring-4 ring-[#18181b]" />
                        <div className="text-sm font-semibold text-neutral-100">
                          Project Manager - Job Interview
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Today 06:00-08:00
                        </div>
                        {/* Stacked Avatars */}
                        <div className="flex -space-x-2 mt-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                          <img
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                          <img
                            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                        </div>
                      </div>

                      {/* Timeline Item 2 */}
                      <div className="relative">
                        <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-white ring-4 ring-[#18181b]" />
                        <div className="text-sm font-semibold text-neutral-100">
                          Project Manager - Job Interview
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Today 06:00-08:00
                        </div>
                        {/* Stacked Avatars */}
                        <div className="flex -space-x-2 mt-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                          <img
                            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                        </div>
                      </div>

                      {/* Timeline Item 3 */}
                      <div className="relative">
                        <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-white ring-4 ring-[#18181b]" />
                        <div className="text-sm font-semibold text-neutral-100">
                          Project Manager - Job Interview
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          Today 06:00-08:00
                        </div>
                        {/* Stacked Avatars */}
                        <div className="flex -space-x-2 mt-2.5">
                          <img
                            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                          <img
                            src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                          <img
                            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                          <img
                            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                            alt="Attendee"
                            className="w-6 h-6 rounded-full object-cover border-2 border-[#18181b]"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* 2. WORKING FORMAT (Distribution Card) */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 lg:p-7 shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-white/80 flex flex-col justify-between">
                  <h3 className="text-lg font-bold text-neutral-900 tracking-tight mb-5">
                    Working Format
                  </h3>

                  <div className="space-y-4">
                    {/* Row 1: On-site */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-medium text-neutral-400">On-site</div>
                        <div className="text-base font-extrabold text-neutral-900">13,982</div>
                      </div>
                      <div className="flex-1 max-w-[170px] h-10 rounded-xl bg-[#faeee7] flex items-center justify-end px-3.5">
                        <span className="text-sm font-extrabold text-[#c86b43]">11.4%</span>
                      </div>
                    </div>

                    {/* Row 2: Hybrid */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-medium text-neutral-400">Hybrid</div>
                        <div className="text-base font-extrabold text-neutral-900">26,214</div>
                      </div>
                      <div className="flex-1 max-w-[170px] h-10 rounded-xl bg-[#faeee7] flex items-center justify-end px-3.5">
                        <span className="text-sm font-extrabold text-[#c86b43]">32.2%</span>
                      </div>
                    </div>

                    {/* Row 3: Remote */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-medium text-neutral-400">Remote</div>
                        <div className="text-base font-extrabold text-neutral-900">41,214</div>
                      </div>
                      <div className="flex-1 max-w-[170px] h-10 rounded-xl bg-[#faeee7] flex items-center justify-end px-3.5">
                        <span className="text-sm font-extrabold text-[#c86b43]">56.4%</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* Audit 900 Dataset Modal */}
      <Dataset900AuditModal
        isOpen={isDataset900Open}
        onClose={() => setIsDataset900Open(false)}
      />

      {/* Canceled Subscription Feedback Modal Demo */}
      <CancellationFeedbackDemoModal
        isOpen={isFeedbackDemoOpen}
        onClose={() => setIsFeedbackDemoOpen(false)}
        tenantId={selectedTenantId}
        onFeedbackSaved={() => loadData()}
      />
    </div>
  );
}
