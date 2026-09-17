'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Copy,
  Check,
  Building2,
  ExternalLink
} from 'lucide-react';
import { 
  formatRupiah, 
  parseMerchants, 
  parsePayments, 
  parsePortfolio, 
  type PaymentStatus,
  type Merchant,
  type RetentionPayment
} from './payment-data';

const gatewayNavGroups: NavGroupData[] = [
  {
    items: [
      { id: 'search', title: 'Search Gateway', icon: Search, shortcut: '⌘K' },
      { id: 'home', title: 'Overview', icon: LayoutDashboard },
      { id: 'supervised-merchants', title: 'Supervised Merchants', icon: Building2, badge: 18 },
      { id: 'portfolio-health', title: 'Portfolio Health', icon: Activity },
    ]
  },
  {
    heading: 'BNI SNAP & Settlement',
    items: [
      { 
        id: 'settlements', 
        title: 'Settlements & VA', 
        icon: CreditCard,
        children: [
          { id: 's-settled', title: 'Settled Transactions', icon: Hash },
          { id: 's-pending', title: 'Pending Settlement', icon: Hash },
          { id: 's-failed', title: 'Failed & Dispute', icon: Hash },
        ]
      },
      { id: 'audit-logs', title: 'Retention Audits', icon: FileText },
      { 
        id: 'merchants-dir', 
        title: 'Merchant Directory', 
        icon: Globe,
        children: [
          { id: 'm-gyms', title: 'Fitness & Gyms', icon: Hash },
          { id: 'm-saas', title: 'SaaS Platforms', icon: Hash },
          { id: 'm-edtech', title: 'EdTech & Courses', icon: Hash },
        ]
      },
      { id: 'rm-support', title: 'RM Support Queue', icon: Users, badge: 3 },
    ]
  },
  {
    heading: 'Developer Hub',
    items: [
      { id: 'snap-credentials', title: 'SNAP API Keys', icon: Terminal },
      { id: 'snap-webhooks', title: 'Webhook Endpoints', icon: Blocks },
    ]
  }
];

const gatewayBottomItems: NavItemData[] = [
  { id: 'settings', title: 'Gateway Config', icon: Settings, shortcut: '⌘,' },
  { id: 'logout', title: 'Log out', icon: LogOut },
];

export default function PaymentGatewayDashboard() {
  const [activeNav, setActiveNav] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState('mch-fitbody-01');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Live Data States
  const [portfolio, setPortfolio] = useState<any>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [payments, setPayments] = useState<RetentionPayment[]>([]);
  const [merchantInsights, setMerchantInsights] = useState<any>(null);

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

      // 4. Fetch AI Health Insights
      const insRes = await fetch(`/api/merchant/${encodeURIComponent(activeMid)}/insights`);
      if (insRes.ok) {
        const insData = await insRes.json();
        setMerchantInsights(insData);
      }
    } catch (e) {
      console.warn('Gagal memuat data gateway:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [selectedMerchantId]);

  // Keyboard shortcut for ⌘K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavSelect = (id: string) => {
    if (id === 'search') {
      setSearchModalOpen(true);
      return;
    }
    setActiveNav(id);
  };

  const selectedMerchant = merchants.find(m => m.id === selectedMerchantId) || {
    id: 'mch-fitbody-01',
    name: 'FitBody Gym & Functional Movement',
    category: 'Fitness & Wellness'
  };

  const copyCredential = () => {
    const dynamicKey = `bni_snap_${selectedMerchant.id.replace(/-/g, '_')}_${btoa(selectedMerchant.id).substring(0, 10).toLowerCase()}`;
    navigator.clipboard.writeText(dynamicKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const topPerformers = [
    {
      id: 1,
      name: 'FitBody Gym & Movement',
      tasks: 'Rp 11.900.000 VA Settled',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      name: 'Zenith Yoga Sanctuary',
      tasks: 'Rp 8.450.000 VA Settled',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 3,
      name: 'Surabaya Iron CrossFit',
      tasks: 'Rp 6.200.000 VA Settled',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 4,
      name: 'Bandung Core Pilates',
      tasks: 'Rp 4.800.000 VA Settled',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#09090b] text-neutral-200 font-sans antialiased overflow-hidden flex flex-col lg:flex-row">
      
      {/* 1. COLLAPSIBLE SIDEBAR */}
      <div 
        className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-[#121215] border-r border-white/10 ${
          !sidebarCollapsed ? 'w-[260px] opacity-100' : 'w-0 opacity-0 border-none'
        }`}
      >
        <SidebarNav
          className="w-[260px] border-none bg-transparent"
          activeId={activeNav}
          onSelect={handleNavSelect}
          navGroups={gatewayNavGroups}
          bottomItems={gatewayBottomItems}
          activeWorkspace="BNI Ecosystem Gateway"
          planLabel="Partner Portal v2.4"
          workspaces={['BNI Ecosystem Gateway', 'FitBody Gym', 'Sandbox Gateway']}
        />
      </div>

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b] border-l border-white/5 relative z-10">
        
        {/* TOP BAR */}
        <header className="h-14 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-[#0c0c0e]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md hover:bg-white/5 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              title="Toggle Sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
              <span className="text-neutral-200 font-semibold">Payment Gateway</span>
              <span>/</span>
              <span className="capitalize text-[#24B1B1] font-semibold">{activeNav.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Merchant Supervised Switcher */}
            <div className="relative hidden md:block">
              <select
                value={selectedMerchantId}
                onChange={(e) => setSelectedMerchantId(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/10 text-neutral-200 appearance-none pr-8 cursor-pointer focus:outline-none focus:border-[#007979]"
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#18181b] text-neutral-200">
                    🏢 {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* SNAP Key Copy */}
            <button
              type="button"
              onClick={copyCredential}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-white/10 text-neutral-300 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
              title="Salin SNAP Secret Key"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              <span className="hidden sm:inline">{copiedKey ? 'Tersalin!' : 'SNAP Key'}</span>
            </button>

            {/* Switch to Merchant Dashboard */}
            <Link
              href="/merchant"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007979]/20 hover:bg-[#007979]/30 text-[#24B1B1] text-xs font-semibold border border-[#007979]/40 transition-colors"
            >
              <span>Merchant View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Refresh Live Data */}
            <button
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-[#18181b] hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#24B1B1]' : ''}`} />
            </button>
          </div>
        </header>

        {/* SCROLLABLE MAIN BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TOP STATS STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121215] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Supervised Merchants</span>
                <Building2 className="w-4 h-4 text-[#24B1B1]" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {merchants.length > 0 ? merchants.length : 18}
              </div>
              <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <span>↑ 100% active</span>
                <span className="text-neutral-500">across Jabodetabek</span>
              </div>
            </div>

            <div className="bg-[#121215] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Total Settled (30d)</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {portfolio?.total_volume ? formatRupiah(portfolio.total_volume) : 'Rp 148.500.000'}
              </div>
              <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <span>↑ 18.4%</span>
                <span className="text-neutral-500">vs last month</span>
              </div>
            </div>

            <div className="bg-[#121215] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>AI Retention Success</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {portfolio?.retention_rate ? `${portfolio.retention_rate}%` : '89.4%'}
              </div>
              <div className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <span>+4.2%</span>
                <span className="text-neutral-500">churn prevented</span>
              </div>
            </div>

            <div className="bg-[#121215] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>SNAP API Gateway</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                99.98%
              </div>
              <div className="text-[11px] text-neutral-400 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span>BNI SNAP v2.0 Operational</span>
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* LEFT 8-COL: KPI Bar Chart & Merchant Activity */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              
              {/* Average KPI Score Card */}
              <div className="bg-[#121215] border border-white/10 rounded-xl p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white tracking-tight">
                        Gateway Average KPI Score
                      </h3>
                      <span className="text-xs text-neutral-400 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                        Past 6 months
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-extrabold text-white tracking-tight">
                        94.8%
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        +3.2% vs target
                      </span>
                    </div>
                  </div>

                  {/* Monthly Cylindrical Bar Chart */}
                  <div className="flex items-end justify-between gap-3 pt-6 border-t border-white/5">
                    <div className="flex flex-col justify-between text-[10px] text-neutral-500 font-medium h-32 pb-4">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>

                    {[
                      { month: 'Feb', pct: '65%' },
                      { month: 'Mar', pct: '82%' },
                      { month: 'Apr', pct: '74%' },
                      { month: 'May', pct: '88%' },
                      { month: 'Jun', pct: '91%' },
                      { month: 'Jul', pct: '95%' },
                    ].map((bar) => (
                      <div key={bar.month} className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-3.5 h-32 bg-white/5 rounded-full flex flex-col justify-end p-0.5">
                          <div 
                            className="w-full bg-gradient-to-t from-[#007979] to-[#24B1B1] rounded-full transition-all duration-500"
                            style={{ height: bar.pct }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-400">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Performance List */}
                <div className="w-full md:w-64 border-t md:border-t-0 md:border-l md:border-white/10 md:pl-6">
                  <h4 className="text-xs font-semibold text-white mb-4 uppercase tracking-wider text-neutral-400">
                    Top Supervised Merchants
                  </h4>
                  <div className="space-y-3">
                    {topPerformers.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                        <div className="relative shrink-0">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                          />
                          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#007979] text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                            {p.id}
                          </div>
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-semibold text-neutral-200 truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-emerald-400 truncate font-mono">
                            {p.tasks}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transactions & Supervised Table */}
              <div className="bg-[#121215] border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Supervised Retention & VA Settlements
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Selected: <span className="text-[#24B1B1] font-medium">{selectedMerchant.name}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-neutral-300 hover:text-white px-2.5 py-1 rounded-md bg-white/5 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-neutral-400 border-b border-white/10 text-[11px] uppercase tracking-wider">
                        <th className="pb-3 px-2 font-medium">Tx ID / VA</th>
                        <th className="pb-3 px-2 font-medium">Member</th>
                        <th className="pb-3 px-2 font-medium">Package</th>
                        <th className="pb-3 px-2 font-medium">Amount</th>
                        <th className="pb-3 px-2 font-medium">Status</th>
                        <th className="pb-3 px-2 text-right font-medium">Channel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {payments.slice(0, 5).map((pay) => (
                        <tr key={pay.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-2 font-mono text-neutral-300 font-medium">
                            {pay.id.substring(0, 10)}...
                          </td>
                          <td className="py-3 px-2 font-medium text-neutral-200">
                            {pay.memberName}
                          </td>
                          <td className="py-3 px-2 text-neutral-400">
                            BNI Retention Plan
                          </td>
                          <td className="py-3 px-2 font-mono font-medium text-neutral-200">
                            {pay.amount ? formatRupiah(pay.amount) : 'Rp 0'}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              pay.status === 'paid' || pay.status === 'SETTLED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {pay.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-neutral-400 font-mono text-[11px]">
                            BNI SNAP VA
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-neutral-500">
                            Belum ada riwayat transaksi settlement untuk merchant ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* RIGHT 4-COL: Upcoming Gateway Syncs & Distribution */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              
              {/* Upcoming Gateway Syncs & Audits */}
              <div className="bg-[#121215] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white tracking-tight mb-4 flex items-center justify-between">
                  <span>Scheduled Syncs & Audits</span>
                  <Clock className="w-4 h-4 text-neutral-400" />
                </h3>

                <div className="relative pl-4 space-y-5 before:content-[''] before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                  <div className="relative">
                    <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-[#007979] ring-4 ring-[#121215]" />
                    <div className="text-xs font-semibold text-neutral-200">
                      BNI SNAP Auto-Reconciliation
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Tonight 23:59 WIB • Batch #4429
                    </div>
                    <span className="inline-block mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Auto Settled
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-[#24B1B1] ring-4 ring-[#121215]" />
                    <div className="text-xs font-semibold text-neutral-200">
                      AI Churn Detector Periodic Run
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Every 6 hours • Gemini AI Model 2.0
                    </div>
                    <span className="inline-block mt-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Risk Engine Live
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-neutral-600 ring-4 ring-[#121215]" />
                    <div className="text-xs font-semibold text-neutral-200">
                      Merchant Portfolio RM Review
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Friday 14:00 WIB • Zoom Video Sync
                    </div>
                    <span className="inline-block mt-1 text-[10px] text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      RM Team
                    </span>
                  </div>
                </div>
              </div>

              {/* Segment Distribution */}
              <div className="bg-[#121215] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white tracking-tight mb-4">
                  Merchant Segment Distribution
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-neutral-300">Fitness & Gyms</div>
                      <div className="text-[11px] text-neutral-500">12 Merchants</div>
                    </div>
                    <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#007979] rounded-full" style={{ width: '65%' }} />
                    </div>
                    <span className="text-xs font-mono font-medium text-neutral-300">65%</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-neutral-300">SaaS & Subs</div>
                      <div className="text-[11px] text-neutral-500">4 Merchants</div>
                    </div>
                    <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-[#24B1B1] rounded-full" style={{ width: '22%' }} />
                    </div>
                    <span className="text-xs font-mono font-medium text-neutral-300">22%</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-neutral-300">EdTech / Courses</div>
                      <div className="text-[11px] text-neutral-500">2 Merchants</div>
                    </div>
                    <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '13%' }} />
                    </div>
                    <span className="text-xs font-mono font-medium text-neutral-300">13%</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ⌘K SEARCH MODAL */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center px-4 py-3 border-b border-white/10">
              <Search className="w-4 h-4 text-neutral-400 mr-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari merchant, virtual account, atau transaksi..."
                className="w-full bg-transparent text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none"
              />
              <button 
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-neutral-200 text-xs transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-2 max-h-80 overflow-y-auto">
              <div className="text-[11px] font-semibold text-neutral-500 px-3 py-1.5 uppercase tracking-wider">
                Merchants
              </div>
              {merchants.map((m) => (
                <div 
                  key={m.id}
                  onClick={() => {
                    setSelectedMerchantId(m.id);
                    setSearchModalOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#24B1B1]" />
                    <span className="text-neutral-200 font-medium">{m.name}</span>
                  </div>
                  <span className="text-neutral-500 font-mono text-[10px]">{m.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
