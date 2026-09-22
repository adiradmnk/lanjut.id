'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Dataset900AuditModal from '@/components/Dataset900AuditModal';
import VisualAnalyticsTab from '@/components/merchant/VisualAnalyticsTab';
import AiPredictionTab from '@/components/merchant/AiPredictionTab';
import FutureScenariosTab from '@/components/merchant/FutureScenariosTab';
import CancellationFeedbackDemoModal from '@/components/merchant/CancellationFeedbackDemoModal';
import BusinessLogicTab from '@/components/merchant/BusinessLogicTab';
import FinanceTab from '@/components/merchant/FinanceTab';
import RetentionInboxTab from '@/components/merchant/RetentionInboxTab';
import HomeTab from '@/components/merchant/HomeTab';
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
  ArrowRight,
  Sparkles
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

interface AnalyticsSessionSummary {
  id: string;
  tenant_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Retention Inbox badge reflects the real at-risk member count once loaded (see
// buildMerchantNavGroups below) — no static/fabricated number.
function buildMerchantNavGroups(atRiskMemberCount: number): NavGroupData[] {
  return [
    {
      items: [
        { id: 'search', title: 'Search', icon: Search, shortcut: '⌘K' },
        { id: 'home', title: 'Dashboard', icon: LayoutDashboard },
        {
          id: 'inbox',
          title: 'Retention Inbox',
          icon: Inbox,
          badge: atRiskMemberCount > 0 ? atRiskMemberCount : undefined,
        },
        { id: 'analytics', title: 'Analytics', icon: Activity, hasAddAction: true },
      ]
    },
    {
      heading: 'Workspace',
      items: [
        { id: 'business-logic', title: 'Business Logic', icon: Cpu, hasAddAction: true },
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
}

const merchantBottomItems: NavItemData[] = [
  { id: 'settings', title: 'Settings', icon: Settings, shortcut: '⌘,' },
  { id: 'logout', title: 'Log out', icon: LogOut },
];

export default function MerchantDashboardPage() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeId, setActiveId] = useState('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tenant state mapped to Workspace
  const [tenantsList, setTenantsList] = useState<{ id: string; name: string; category: string }[]>([
    { id: 'mch-fitbody-01', name: 'FitBody Gym & Movement', category: 'Fitness & Wellness' },
    { id: 'mch-zenyoga-02', name: 'Zenith Yoga Sanctuary', category: 'Boutique Yoga Studio' },
    { id: 'mch-ironcrossfit-03', name: 'Surabaya Iron CrossFit', category: 'High-Intensity Strength' },
    { id: 'mch-bandungpilates-04', name: 'Bandung Core Pilates (Cold-Start)', category: 'Pilates Reformer' },
  ]);
  // Selection tracked by stable tenant ID, not display name — the backend's real business
  // names don't match the placeholder names above ("FitBody Gym & Movement" vs the real
  // "FitBody Gym & Functional Movement"), so a name-based lookup silently falls back to
  // tenantsList[0] the moment members-overview replaces tenantsList with real names,
  // switching the whole dashboard to a different (often near-empty seed) tenant.
  const [activeTenantId, setActiveTenantId] = useState('mch-fitbody-01');

  const [stats, setStats] = useState<MerchantStats>({
    total_members: 0,
    at_risk_members: 0,
    saved_members: 0,
    retention_rate_pct: 0,
    total_revenue_paid_idr: 0,
    avg_quota_utilization_pct: 0,
    outreach_sent: 0,
    magic_link_opened: 0,
    va_settled: 0,
  });

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataset900Open, setIsDataset900Open] = useState(false);
  const [isFeedbackDemoOpen, setIsFeedbackDemoOpen] = useState(false);

  const [mlAnalytics, setMlAnalytics] = useState<any>(null);
  const [revenueInsights, setRevenueInsights] = useState<any>(null);

  // Gemini-style sidebar split: 'menu' shows the normal nav tree, 'ai' swaps it for this
  // tenant's AI analytics chat history and forces the main pane to the AI chat view.
  const [sidebarMode, setSidebarMode] = useState<'menu' | 'ai'>('menu');
  const [analyticsSessions, setAnalyticsSessions] = useState<AnalyticsSessionSummary[]>([]);
  const [activeAnalyticsSessionId, setActiveAnalyticsSessionId] = useState<string | null>(null);

  const selectedTenant = tenantsList.find(t => t.id === activeTenantId) || tenantsList[0];
  const activeWorkspace = selectedTenant.name;
  const handleWorkspaceSelect = (name: string) => {
    const t = tenantsList.find(x => x.name === name);
    if (t) setActiveTenantId(t.id);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const statsRes = await fetch(`/api/merchant/${selectedTenant.id}/insights`);
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
    // 60s, not a few seconds: these endpoints call the AI sidecar (RM summary, revenue
    // insights), which makes a real Gemini API call each time. Polling too aggressively
    // burns through Gemini quota fast and, worse, queues up requests faster than the AI
    // sidecar can answer them, starving every other AI feature (chat, analytics, ...) of
    // capacity while this tab sits open in the background.
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [selectedTenant.id]);

  const loadAnalyticsSessions = async () => {
    try {
      const res = await fetch(`/api/merchant/${selectedTenant.id}/analytics-sessions`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
    } catch (err) {
      console.warn('Gagal memuat riwayat sesi analisis:', err);
    }
  };

  useEffect(() => {
    setActiveAnalyticsSessionId(null);
    loadAnalyticsSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant.id]);

  const upsertAnalyticsSession = (session: AnalyticsSessionSummary) => {
    setAnalyticsSessions(prev => {
      const exists = prev.some(s => s.id === session.id);
      return exists ? prev.map(s => (s.id === session.id ? { ...s, ...session } : s)) : [session, ...prev];
    });
    setActiveAnalyticsSessionId(session.id);
  };

  const aiSidebarPanel = (
    <div className="flex flex-col gap-0.5">
      <button
        onClick={() => setActiveAnalyticsSessionId(null)}
        className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg cursor-pointer transition-all text-[13px] font-medium mb-1 ${
          activeAnalyticsSessionId === null
            ? 'bg-[#2e2e2e] text-white'
            : 'text-[#a1a1a1] hover:bg-[#2e2e2e]/40 hover:text-white'
        }`}
      >
        <Sparkles className="w-[16px] h-[16px]" strokeWidth={1.5} />
        Chat Baru
      </button>
      {analyticsSessions.length === 0 ? (
        <p className="px-2.5 text-[12px] text-neutral-500">Belum ada riwayat analisis.</p>
      ) : (
        analyticsSessions.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveAnalyticsSessionId(s.id)}
            className={`text-left px-2.5 py-[7px] rounded-lg cursor-pointer transition-all text-[13px] truncate ${
              activeAnalyticsSessionId === s.id
                ? 'bg-[#2e2e2e] text-white font-medium'
                : 'text-[#a1a1a1] hover:bg-[#2e2e2e]/40 hover:text-white'
            }`}
          >
            {s.title}
          </button>
        ))
      )}
    </div>
  );

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

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-[#171717] text-[#fafafa] font-sans antialiased overflow-hidden select-none">
      
      {/* 1. LEFT COLLAPSIBLE SIDEBAR */}
      <div 
        className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-[#171717] ${
          isOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <SidebarNav 
          className="w-[260px] border-none bg-[#171717]" 
          activeId={activeId}
          onSelect={handleSelect}
          activeWorkspace={activeWorkspace}
          onWorkspaceSelect={handleWorkspaceSelect}
          navGroups={buildMerchantNavGroups(stats.at_risk_members)}
          bottomItems={merchantBottomItems}
          planLabel="Merchant Pro"
          workspaces={tenantsList.map(t => t.name)}
          mode={sidebarMode}
          onModeChange={setSidebarMode}
          aiPanel={aiSidebarPanel}
        />
      </div>

      {/* 2. MAIN CONTENT AREA (FIT TO PAGE) */}
      <div className="flex-1 bg-[#171717] flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top Header Bar (Breadcrumb Only) */}
        <header className="h-12 border-b border-white/10 flex items-center px-4 sm:px-6 bg-[#171717] shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-md text-neutral-400 hover:bg-[#2e2e2e]/50 hover:text-white transition-colors cursor-pointer"
              title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              {isOpen ? <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.5} /> : <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.5} />}
            </button>
            <div className="flex items-center gap-2 text-sm text-[#a1a1a1]">
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{activeWorkspace}</span>
              <span>/</span>
              <span className="font-medium text-white truncate capitalize">{sidebarMode === 'ai' ? 'AI Analytics' : activeId}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className={`flex-1 ${sidebarMode === 'ai' ? 'overflow-hidden flex flex-col p-4 sm:p-6' : 'overflow-y-auto p-4 sm:p-6 lg:p-8'} bg-[#171717]`}>
          {sidebarMode === 'ai' ? (
            <VisualAnalyticsTab
              analytics={mlAnalytics}
              revenueInsights={revenueInsights}
              tenantId={selectedTenant.id}
              sessionId={activeAnalyticsSessionId}
              onSessionCreated={upsertAnalyticsSession}
            />
          ) : (
          <>
          {activeId === 'home' && (
            <HomeTab
              stats={stats}
              tenantName={selectedTenant.name}
              tenantCategory={selectedTenant.category}
              onNavigate={(tab) => setActiveId(tab)}
              onOpenDataset900={() => setIsDataset900Open(true)}
            />
          )}

          {activeId === 'inbox' && (
            <RetentionInboxTab
              members={members}
              tenantId={selectedTenant.id}
              onOpenFeedbackDemo={() => setIsFeedbackDemoOpen(true)}
              onRefresh={loadData}
            />
          )}

          {activeId === 'analytics' && (
            <VisualAnalyticsTab
              analytics={mlAnalytics}
              revenueInsights={revenueInsights}
              tenantId={selectedTenant.id}
            />
          )}

          {activeId === 'business-logic' && (
            <BusinessLogicTab 
              tenantId={selectedTenant.id}
              tenantName={selectedTenant.name}
              tenantCategory={selectedTenant.category}
            />
          )}

          {activeId === 'finance' && (
            <FinanceTab
              tenantId={selectedTenant.id}
              tenantName={selectedTenant.name}
            />
          )}

          {activeId === 'api' && (
            <div className="bg-[#212121] border border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">BNI SNAP API Credentials</h2>
              </div>
              <p className="text-xs text-neutral-400">
                Gunakan kredensial sandbox resmi BNI Open Banking SNAP untuk mengotomatiskan rekonsiliasi dan verifikasi signature.
              </p>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-400">Merchant Client ID</label>
                  <div className="mt-1 flex items-center justify-between p-2.5 rounded-lg bg-[#171717] border border-white/10 font-mono text-xs text-neutral-500">
                    <span>Belum diprovisikan</span>
                    <span className="text-[10px] text-neutral-500 uppercase">Not configured</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-mono uppercase text-neutral-400">HMAC Secret Key</label>
                  <div className="mt-1 flex items-center justify-between p-2.5 rounded-lg bg-[#171717] border border-white/10 font-mono text-xs text-neutral-500">
                    <span>Belum diprovisikan</span>
                    <span className="text-[10px] text-neutral-500 uppercase">Not configured</span>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-500 pt-1">
                  Hubungi tim LANJUT untuk provisioning kredensial BNI Open Banking SNAP sandbox/production untuk merchant ini.
                </p>
              </div>
            </div>
          )}

          {activeId === 'webhooks' && (
            <div className="bg-[#212121] border border-white/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Blocks className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">BNI Webhook Endpoints</h2>
              </div>
              <p className="text-xs text-neutral-400">
                Endpoint resmi yang menerima notifikasi pelunasan Virtual Account BNI secara real-time.
              </p>
              <div className="p-3 bg-[#171717] border border-white/10 rounded-lg font-mono text-xs text-white flex items-center justify-between">
                <span>https://api.lanjut.id/webhook/bni-payment</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-neutral-400 border border-white/10">
                  Registered
                </span>
              </div>
            </div>
          )}

          {!['home', 'inbox', 'analytics', 'business-logic', 'finance', 'api', 'webhooks'].includes(activeId) && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] border border-dashed border-white/10 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight capitalize">
                {activeId.replace('-', ' ')}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Pengaturan dan preferensi merchant untuk {activeId}.
              </p>
            </div>
          )}
          </>
          )}
        </main>
      </div>

      {/* Global Search Modal (Esc to Close) — filters real loaded members by name/email */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm px-4">
          <div className="fixed inset-0" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#212121] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center px-4 border-b border-white/10">
              <Search className="w-[18px] h-[18px] text-neutral-400 mr-3 shrink-0" strokeWidth={1.5} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setIsSearchOpen(false); }}
                className="flex-1 bg-transparent py-4 outline-none text-[14px] text-white placeholder:text-[#a1a1a1]"
                placeholder="Search members by name or email..."
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
            <div className="max-h-[320px] overflow-y-auto">
              {searchQuery.trim() === '' ? (
                <div className="p-2 py-8 flex flex-col items-center justify-center">
                  <Command className="w-6 h-6 text-neutral-600 mb-2" strokeWidth={1.5} />
                  <p className="text-[13px] text-neutral-400 font-medium">Ketik nama atau email member...</p>
                </div>
              ) : (
                (() => {
                  const q = searchQuery.trim().toLowerCase();
                  const results = members.filter(m =>
                    m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
                  );
                  if (results.length === 0) {
                    return (
                      <div className="p-6 text-center text-[13px] text-neutral-500">
                        Tidak ada member yang cocok dengan "{searchQuery}".
                      </div>
                    );
                  }
                  return (
                    <div className="py-2">
                      {results.slice(0, 20).map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setActiveId('inbox');
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div>
                            <div className="text-[13px] text-white font-medium">{m.name}</div>
                            <div className="text-[11px] text-neutral-500">{m.email}</div>
                          </div>
                          {m.churn_risk_flag === 'HIGH' && (
                            <span className="text-[10px] font-semibold uppercase text-orange-400">At Risk</span>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })()
              )}
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
