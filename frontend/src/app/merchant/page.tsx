'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Dataset900AuditModal from '@/components/Dataset900AuditModal';
import VisualAnalyticsTab from '@/components/merchant/VisualAnalyticsTab';
import AiPredictionTab from '@/components/merchant/AiPredictionTab';
import FutureScenariosTab from '@/components/merchant/FutureScenariosTab';
import CancellationFeedbackDemoModal from '@/components/merchant/CancellationFeedbackDemoModal';
import { 
  SidebarNav, 
  type NavGroupData, 
  type NavItemData 
} from '@/components/DarkSidebarNav';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Hash,
  ChevronDown,
  ChevronRight,
  Inbox,
  Calendar,
  Activity,
  CreditCard,
  Globe,
  Terminal,
  Blocks,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
  X,
  FileText,
  Wallet,
  Download,
  MoreHorizontal,
  AlertTriangle,
  Cpu,
  ArrowRight
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

const merchantNavGroups: NavGroupData[] = [
  {
    items: [
      { id: 'search', title: 'Search', icon: Search, shortcut: '⌘K' },
      { id: 'home', title: 'Dashboard', icon: LayoutDashboard },
      { id: 'inbox', title: 'Retention Inbox', icon: Inbox, badge: 12 },
      { id: 'analytics', title: 'Analytics', icon: Activity },
    ]
  },
  {
    heading: 'Workspace',
    items: [
      { 
        id: 'projects', 
        title: 'Campaigns', 
        icon: FolderKanban,
        children: [
          { id: 'p-active', title: 'Active', icon: Hash },
          { id: 'p-archived', title: 'Archived', icon: Hash },
        ]
      },
      { id: 'calendar', title: 'Calendar & Scenarios', icon: Calendar },
      { 
        id: 'team', 
        title: 'Instructors & Team', 
        icon: Users,
        children: [
          { id: 't-trainers', title: 'Trainers', icon: Hash },
          { id: 't-staff', title: 'Front Office', icon: Hash },
        ]
      },
      { 
        id: 'customers', 
        title: 'Members Directory', 
        icon: Globe,
        children: [
          { id: 'c-active', title: 'Active Members', icon: Hash },
          { id: 'c-at-risk', title: 'At-Risk (Churn)', icon: Hash },
        ]
      },
      { id: 'finance', title: 'BNI Revenue & VA', icon: CreditCard },
    ]
  },
  {
    heading: 'Developers',
    items: [
      { id: 'api', title: 'API Keys', icon: Terminal },
      { id: 'webhooks', title: 'Webhooks', icon: Blocks },
    ]
  }
];

const merchantBottomItems: NavItemData[] = [
  { id: 'settings', title: 'Settings', icon: Settings, shortcut: '⌘,' },
  { id: 'logout', title: 'Log out', icon: LogOut },
];

export default function MerchantDashboardPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Tenant state mapped to Workspace
  const [tenantsList, setTenantsList] = useState<{ id: string; name: string; category: string }[]>([
    { id: 'mch-fitbody-01', name: 'FitBody Gym & Movement', category: 'Fitness & Wellness' },
    { id: 'mch-zenyoga-02', name: 'Zenith Yoga Sanctuary', category: 'Boutique Yoga Studio' },
    { id: 'mch-ironcrossfit-03', name: 'Surabaya Iron CrossFit', category: 'High-Intensity Strength' },
    { id: 'mch-bandungpilates-04', name: 'Bandung Core Pilates (Cold-Start)', category: 'Pilates Reformer' },
  ]);
  const [activeWorkspace, setActiveWorkspace] = useState('FitBody Gym & Movement');

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

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataset900Open, setIsDataset900Open] = useState(false);
  const [isFeedbackDemoOpen, setIsFeedbackDemoOpen] = useState(false);

  const [mlAnalytics, setMlAnalytics] = useState<any>({
    total_customers: 49229,
    active_customers: 36183,
    churned_customers: 13046,
    churn_rate_pct: 26.5,
    model_accuracy_pct: 82.4,
    ai_features_count: 15,
  });
  const [revenueInsights, setRevenueInsights] = useState<any>(null);

  const selectedTenant = tenantsList.find(t => t.name === activeWorkspace) || tenantsList[0];

  const loadData = async () => {
    setIsLoading(true);
    try {
      const statsRes = await fetch(`/api/merchant/dashboard-stats?merchant_id=${selectedTenant.id}`);
      if (statsRes.ok) {
        const s = await statsRes.json();
        if (s.stats) setStats(s.stats);
      }

      const memRes = await fetch(`/api/merchant/members-overview?merchant_id=${selectedTenant.id}`);
      if (memRes.ok) {
        const m = await memRes.json();
        if (m.members) setMembers(m.members);
        if (m.all_tenants) setTenantsList(m.all_tenants);
      }

      const analyticsRes = await fetch(`/api/merchant/churn-analytics?merchant_id=${selectedTenant.id}`);
      if (analyticsRes.ok) {
        const a = await analyticsRes.json();
        if (a.analytics) setMlAnalytics(a.analytics);
      }

      const revRes = await fetch(`/api/merchant/${selectedTenant.id}/revenue-insights`);
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
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [selectedTenant.id]);

  const handleSelect = (id: string) => {
    if (id === 'search') {
      setIsSearchOpen(true);
      return;
    }
    if (id === 'logout') {
      window.location.href = '/login';
      return;
    }
    setActiveId(id);
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
    link.setAttribute('download', `LANJUT_Merchant_Dataset_${selectedTenant.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const displayEmployees = [
    { id: 'OM1246924', name: 'Judy Abbott', role: 'Interactions Manager', progress: 75, color: '#c96f48' },
    { id: 'OM1243473', name: 'Martin Feeney', role: 'Accountability Specialist', progress: 85, color: '#dd845e' },
    { id: 'OM4637343', name: 'Ellen Streich', role: 'Mobility Supervisor', progress: 55, color: '#c96f48' },
    { id: 'OM1535524', name: 'Ellis Lubowitz', role: 'Product Security Engineer', progress: 40, color: '#e8a183' },
  ];

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-[#09090b] text-[#fafafa] font-sans antialiased overflow-hidden select-none">
      
      {/* 1. LEFT COLLAPSIBLE SIDEBAR */}
      <div 
        className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-[#121215] border-r border-white/10 ${
          isOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 border-none'
        }`}
      >
        <SidebarNav 
          className="w-[260px] border-none bg-transparent" 
          activeId={activeId}
          onSelect={handleSelect}
          activeWorkspace={activeWorkspace}
          onWorkspaceSelect={setActiveWorkspace}
          navGroups={merchantNavGroups}
          bottomItems={merchantBottomItems}
          planLabel="Merchant Pro"
          workspaces={tenantsList.map(t => t.name)}
        />
      </div>

      {/* 2. MAIN CONTENT AREA (FIT TO PAGE) */}
      <div className="flex-1 bg-[#09090b] flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Header Bar (Breadcrumb Only) */}
        <header className="h-12 border-b border-white/10 flex items-center px-4 sm:px-6 bg-[#121215] shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-md text-neutral-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              {isOpen ? <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.5} /> : <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />}
            </button>
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeWorkspace}</span>
              <span>/</span>
              <span className="font-medium text-white truncate capitalize">{activeId}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#09090b]">
          
          {/* View Tab 1: Visual Analytics */}
          {activeId === 'analytics' && (
            <div className="bg-[#121215] border border-white/10 rounded-xl p-6 shadow-sm">
              <VisualAnalyticsTab analytics={mlAnalytics} revenueInsights={revenueInsights} />
            </div>
          )}

          {/* View Tab 2: AI Prediction */}
          {(activeId === 'projects' || activeId === 'p-active') && (
            <div className="bg-[#121215] border border-white/10 rounded-xl p-6 shadow-sm">
              <AiPredictionTab />
            </div>
          )}

          {/* View Tab 3: Future Scenarios */}
          {activeId === 'calendar' && (
            <div className="bg-[#121215] border border-white/10 rounded-xl p-6 shadow-sm">
              <FutureScenariosTab />
            </div>
          )}

          {/* Default Home / Dashboard View */}
          {(activeId === 'home' || activeId === 'inbox' || activeId === 'team' || activeId === 'customers' || activeId === 'finance' || activeId === 'api' || activeId === 'webhooks' || activeId === 'settings' || activeId === 'p-archived' || activeId === 't-trainers' || activeId === 't-staff' || activeId === 'c-active' || activeId === 'c-at-risk') && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-7xl mx-auto">
              
              {/* LEFT & CENTER COLUMN (8 COLS) */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                
                {/* 1. TOP STAT STRIP */}
                <div className="bg-[#121215] border border-white/10 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Stat 1 */}
                  <div className="flex items-center gap-3.5 pl-2">
                    <div className="w-10 h-10 rounded-lg bg-[#007979]/15 text-[#24B1B1] flex items-center justify-center border border-[#007979]/30">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-neutral-400">Total Employees / Members</div>
                      <div className="text-xl font-bold text-white tracking-tight mt-0.5">
                        {stats.total_members ? stats.total_members.toLocaleString() : '49,229'}
                      </div>
                    </div>
                  </div>

                  {/* Stat 2 */}
                  <div className="flex items-center gap-3.5 pl-2 sm:border-l sm:border-white/10">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-neutral-400">Active Retained</div>
                      <div className="text-xl font-bold text-white tracking-tight mt-0.5">
                        {stats.saved_members ? stats.saved_members.toLocaleString() : '34'}
                      </div>
                    </div>
                  </div>

                  {/* Stat 3 */}
                  <div className="flex items-center gap-3.5 pl-2 sm:border-l sm:border-white/10">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-neutral-400">Total BNI Revenue</div>
                      <div className="text-xl font-bold text-white tracking-tight mt-0.5">
                        Rp {Math.round(stats.total_revenue_paid_idr / 1000000)}M
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. AVERAGE KPI SCORE CARD + TOP PERFORMANCE */}
                <div className="bg-[#121215] border border-white/10 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                  {/* Left part: Bar Chart & KPI */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          Average Retention KPI Score
                        </h3>
                        <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-neutral-300 text-xs font-medium flex items-center gap-1.5">
                          <span>Past 3 months</span>
                          <ChevronDown className="w-3 h-3 text-neutral-400" />
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2 mb-1 mt-3">
                        <span className="text-4xl font-extrabold text-white tracking-tight">
                          {stats.retention_rate_pct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-emerald-400 font-semibold mb-6 flex items-center gap-1">
                        <span>+2.34% vs last cycle</span>
                      </div>
                    </div>

                    {/* Cylindrical Pill Bar Chart (Feb to Jul) */}
                    <div className="flex items-end justify-between gap-3 pt-4 border-t border-white/10">
                      {/* Y-Axis Labels */}
                      <div className="flex flex-col justify-between text-[10px] text-neutral-500 font-mono h-36 pb-6">
                        <span>100%</span>
                        <span>75%</span>
                        <span>50%</span>
                        <span>25%</span>
                        <span>0%</span>
                      </div>

                      {/* Bar 1: Feb */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-white/5 rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[45%] bg-gradient-to-t from-[#007979] to-[#24B1B1] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400">Feb</span>
                      </div>

                      {/* Bar 2: Mar */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-white/5 rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[80%] bg-gradient-to-t from-[#007979] to-[#24B1B1] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400">Mar</span>
                      </div>

                      {/* Bar 3: Apr */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-white/5 rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[60%] bg-gradient-to-t from-[#007979] to-[#24B1B1] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400">Apr</span>
                      </div>

                      {/* Bar 4: May */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-white/5 rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[65%] bg-gradient-to-t from-[#007979] to-[#24B1B1] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400">May</span>
                      </div>

                      {/* Bar 5: Jun */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-white/5 rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[30%] bg-gradient-to-t from-[#007979] to-[#24B1B1] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400">Jun</span>
                      </div>

                      {/* Bar 6: Jul */}
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-36 bg-white/5 rounded-full flex flex-col justify-end p-0.5">
                          <div className="w-full h-[55%] bg-gradient-to-t from-[#007979] to-[#24B1B1] rounded-full" />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400">Jul</span>
                      </div>
                    </div>
                  </div>

                  {/* Right part: Top Performance list */}
                  <div className="w-full md:w-56 border-t md:border-t-0 md:border-l md:border-white/10 md:pl-6 pt-4 md:pt-0">
                    <h4 className="text-sm font-bold text-white mb-4 tracking-tight">
                      Top Performance
                    </h4>
                    
                    <div className="space-y-3.5">
                      {topPerformers.map((p) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-9 h-9 rounded-full object-cover border border-white/20"
                            />
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-neutral-900 border border-white/20 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                              {p.id}
                            </div>
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-semibold text-white leading-snug truncate">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">
                              {p.tasks}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. EMPLOYEES TABLE CARD */}
                <div className="bg-[#121215] border border-white/10 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Team & Member Performance Directory
                    </h3>
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      className="text-xs font-medium text-[#24B1B1] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-neutral-400 font-medium border-b border-white/10">
                          <th className="pb-3 px-2">ID</th>
                          <th className="pb-3 px-2">Name</th>
                          <th className="pb-3 px-2">Role</th>
                          <th className="pb-3 px-2">Health / Quota</th>
                          <th className="pb-3 px-2 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {displayEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2 font-mono text-neutral-400">
                              {emp.id}
                            </td>
                            <td className="py-3 px-2 font-semibold text-white">
                              {emp.name}
                            </td>
                            <td className="py-3 px-2 text-neutral-400">
                              {emp.role}
                            </td>
                            <td className="py-3 px-2">
                              <div className="w-28 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500 bg-[#007979]"
                                  style={{ width: `${emp.progress}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button
                                type="button"
                                className="text-neutral-500 hover:text-white cursor-pointer p-1"
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

              {/* RIGHT COLUMN (4 COLS) */}
              <div className="xl:col-span-4 flex flex-col gap-6">
                
                {/* 1. UPCOMING MEETINGS */}
                <div className="bg-[#121215] border border-white/10 rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight mb-5">
                    Upcoming Meetings & Check-ins
                  </h3>

                  <div className="relative pl-5 space-y-6 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                    
                    {/* Item 1 */}
                    <div className="relative">
                      <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-[#24B1B1] ring-4 ring-[#121215]" />
                      <div className="text-sm font-semibold text-white">
                        Retention Strategy - Churn Review
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Today 09:00 - 10:30
                      </div>
                      <div className="flex -space-x-2 mt-2.5">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                          alt="Attendee"
                          className="w-6 h-6 rounded-full object-cover border-2 border-[#121215]"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                          alt="Attendee"
                          className="w-6 h-6 rounded-full object-cover border-2 border-[#121215]"
                        />
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="relative">
                      <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-[#007979] ring-4 ring-[#121215]" />
                      <div className="text-sm font-semibold text-white">
                        BNI SNAP Settlement Sync
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Tomorrow 14:00 - 15:00
                      </div>
                      <div className="flex -space-x-2 mt-2.5">
                        <img
                          src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80"
                          alt="Attendee"
                          className="w-6 h-6 rounded-full object-cover border-2 border-[#121215]"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80"
                          alt="Attendee"
                          className="w-6 h-6 rounded-full object-cover border-2 border-[#121215]"
                        />
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="relative">
                      <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-neutral-600 ring-4 ring-[#121215]" />
                      <div className="text-sm font-semibold text-white">
                        Class Capacity Re-allocation
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Friday 11:00 - 12:00
                      </div>
                      <div className="flex -space-x-2 mt-2.5">
                        <img
                          src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80"
                          alt="Attendee"
                          className="w-6 h-6 rounded-full object-cover border-2 border-[#121215]"
                        />
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                          alt="Attendee"
                          className="w-6 h-6 rounded-full object-cover border-2 border-[#121215]"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* 2. WORKING FORMAT (Distribution Card) */}
                <div className="bg-[#121215] border border-white/10 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight mb-5">
                    Member Attendance Channel
                  </h3>

                  <div className="space-y-4">
                    {/* Row 1: Studio */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-medium text-neutral-400">On-studio Sessions</div>
                        <div className="text-base font-bold text-white mt-0.5">13,982</div>
                      </div>
                      <div className="flex-1 max-w-[150px] h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-end px-3">
                        <span className="text-sm font-bold text-[#24B1B1]">11.4%</span>
                      </div>
                    </div>

                    {/* Row 2: Hybrid */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-medium text-neutral-400">Hybrid / Multi-Pass</div>
                        <div className="text-base font-bold text-white mt-0.5">26,214</div>
                      </div>
                      <div className="flex-1 max-w-[150px] h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-end px-3">
                        <span className="text-sm font-bold text-[#24B1B1]">32.2%</span>
                      </div>
                    </div>

                    {/* Row 3: Online */}
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-medium text-neutral-400">Online & On-Demand</div>
                        <div className="text-base font-bold text-white mt-0.5">41,214</div>
                      </div>
                      <div className="flex-1 max-w-[150px] h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-end px-3">
                        <span className="text-sm font-bold text-[#24B1B1]">56.4%</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* Global Search Modal (Esc to Close) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm px-4">
          <div className="fixed inset-0" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#121215] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 border-b border-white/10">
              <Search className="w-[18px] h-[18px] text-neutral-400 mr-3 shrink-0" strokeWidth={1.5} />
              <input 
                autoFocus
                className="flex-1 bg-transparent py-4 outline-none text-[14px] text-white placeholder:text-neutral-500"
                placeholder="Search members, campaigns, or actions..."
              />
              <kbd 
                onClick={() => setIsSearchOpen(false)}
                className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 ml-2 text-[10px] font-medium font-mono text-neutral-400 bg-white/10 border border-white/10 rounded-[4px] cursor-pointer hover:text-white transition-colors"
              >
                ESC
              </kbd>
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="ml-3 p-1 rounded-md text-neutral-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-2 py-8 flex flex-col items-center justify-center">
              <Command className="w-6 h-6 text-neutral-600 mb-2" strokeWidth={1.5} />
              <p className="text-[13px] text-neutral-400 font-medium">Type a command or search member...</p>
            </div>
          </div>
        </div>
      )}

      {/* Audit 900 Dataset Modal */}
      <Dataset900AuditModal
        isOpen={isDataset900Open}
        onClose={() => setIsDataset900Open(false)}
      />

      {/* Canceled Subscription Feedback Modal Demo */}
      <CancellationFeedbackDemoModal
        isOpen={isFeedbackDemoOpen}
        onClose={() => setIsFeedbackDemoOpen(false)}
        tenantId={selectedTenant.id}
        onFeedbackSaved={() => loadData()}
      />
    </div>
  );
}
