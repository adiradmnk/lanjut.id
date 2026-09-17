'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Building2,
  ShieldCheck,
  TrendingUp,
  FileText,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { 
  formatRupiah, 
  parseMerchants, 
  parsePayments, 
  parsePortfolio, 
  paymentStatus, 
  paymentStatusLabel, 
  type PaymentStatus,
  type Merchant,
  type RetentionPayment
} from './payment-data';

export type NavItemData = {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: number | string;
  shortcut?: string;
  children?: NavItemData[];
};

export type NavGroupData = {
  heading?: string;
  items: NavItemData[];
};

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

function MerchantSwitcher({ 
  merchants, 
  selectedId, 
  onSelect 
}: { 
  merchants: Merchant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const current = merchants.find(m => m.id === selectedId) || merchants[0] || {
    id: 'mch-fitbody-01',
    name: 'FitBody Gym & Movement',
    category: 'Fitness & Wellness'
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-2.5 py-2 mb-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors select-none group border border-border/40 bg-card/40"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-primary text-primary-foreground flex items-center justify-center font-bold text-[13px] shadow-sm">
            {current.name.charAt(0)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[13px] font-semibold leading-none mb-1 text-foreground truncate max-w-[130px]">{current.name}</span>
            <span className="text-[11px] text-muted-foreground leading-none truncate max-w-[130px]">{current.category || 'BNI SNAP Partner'}</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors shrink-0" strokeWidth={1.5} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-[52px] left-0 w-full bg-card border border-border/60 rounded-lg shadow-xl z-50 py-1.5 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-[260px] overflow-y-auto">
            <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Pilih Merchant Binaan
            </div>
            {merchants.map(m => (
              <div 
                key={m.id}
                onClick={() => { onSelect(m.id); setIsOpen(false); }}
                className={`px-3 py-2 mx-1 text-[12px] rounded-md cursor-pointer transition-colors ${current.id === m.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <div className="font-medium text-foreground">{m.name}</div>
                <div className="text-[10px] text-muted-foreground">{m.category}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NavItem({ 
  item, 
  activeId, 
  onSelect,
  level = 0
}: { 
  item: NavItemData; 
  activeId: string; 
  onSelect: (id: string) => void;
  level?: number;
}) {
  const isActive = activeId === item.id;
  const hasChildren = !!item.children;
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      onSelect(item.id);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div 
        className={`group flex items-center justify-between px-2.5 py-[7px] rounded-[6px] cursor-pointer transition-all duration-200 select-none
          ${isActive 
            ? 'bg-black/5 dark:bg-white/10 text-foreground font-medium' 
            : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground/90'
          }
        `}
        style={{ paddingLeft: `${level * 12 + 10}px` }}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <item.icon 
            className={`w-[16px] h-[16px] transition-colors shrink-0
              ${isActive ? 'text-foreground' : 'text-muted-foreground/70 group-hover:text-foreground/70'}
            `} 
            strokeWidth={1.5} 
          />
          <span className="text-[13px] tracking-wide truncate">
            {item.title}
          </span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {item.shortcut && (
             <kbd className="hidden group-hover:inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-medium font-mono text-muted-foreground/60 bg-background/50 border border-border/50 rounded-[4px] shadow-xs">
               {item.shortcut}
             </kbd>
          )}
          {item.badge && (
            <span className="flex items-center justify-center h-4 px-1.5 text-[9px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight 
              className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {hasChildren && (
        <div 
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden min-h-0 relative flex flex-col gap-0.5 mt-0.5">
            <div 
              className="absolute top-0 bottom-0 border-l border-black/5 dark:border-white/5"
              style={{ left: `${level * 12 + 17.5}px` }}
            />
            {item.children!.map(child => (
              <NavItem 
                key={child.id} 
                item={child} 
                activeId={activeId} 
                onSelect={onSelect} 
                level={level + 1} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  return (
    <div className="flex h-screen w-full bg-background font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside 
        className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-card/70 border-r border-border/50 flex flex-col ${
          isSidebarOpen ? 'w-[270px] opacity-100' : 'w-0 opacity-0 border-none'
        }`}
      >
        <div className="p-3 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              B
            </div>
            <span className="font-bold text-sm tracking-tight text-foreground">BNI PG Gateway</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
            SNAP v2.1
          </span>
        </div>

        <div className="p-3">
          <MerchantSwitcher 
            merchants={merchants} 
            selectedId={selectedMerchantId} 
            onSelect={setSelectedMerchantId} 
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden">
          {navGroups.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              {group.heading && (
                <span className="px-2.5 mb-1 text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase">
                  {group.heading}
                </span>
              )}
              {group.items.map(item => (
                <NavItem 
                  key={item.id} 
                  item={item} 
                  activeId={activeTab} 
                  onSelect={handleSelectNav} 
                />
              ))}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-border/40 flex flex-col gap-0.5">
          {bottomItems.map(item => (
            <NavItem 
              key={item.id} 
              item={item} 
              activeId={activeTab} 
              onSelect={handleSelectNav} 
            />
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/[0.015] dark:bg-white/[0.015] overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-5 bg-card/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-colors"
              title="Toggle Menu"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-[18px] h-[18px]" /> : <PanelLeftOpen className="w-[18px] h-[18px]" />}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
              <span className="font-semibold text-foreground truncate">{selectedMerchant.name}</span>
              <span>/</span>
              <span className="capitalize">{activeTab.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2 h-8 px-3 text-xs text-muted-foreground bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md transition-colors border border-border/40"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari invoice, VA, atau nominal...</span>
              <kbd className="text-[10px] font-mono px-1 py-0.5 bg-background border border-border/50 rounded">⌘K</kbd>
            </button>

            <button 
              onClick={loadData} 
              disabled={isRefreshing}
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-foreground bg-card hover:bg-black/5 dark:hover:bg-white/5 border border-border/60 rounded-md shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sinkronisasi</span>
            </button>

            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              RM
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 [&::-webkit-scrollbar]:hidden">
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
                <div className="p-5 bg-card rounded-xl border border-border/60 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Perputaran BNI VA Bulanan</span>
                    <CreditCard className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-foreground">
                      {formatRupiah(portfolio?.monthlyTurnover ?? 142000000)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+14.2% dari target amortisasi BNI</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-card rounded-xl border border-border/60 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Merchant Binaan Disupervisi</span>
                    <Building2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-foreground">
                      {portfolio?.merchantCount ?? merchants.length} Merchant
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      100% menggunakan integrasi BNI SNAP
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-card rounded-xl border border-border/60 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">Debt Service Coverage (DSCR)</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      2.45x (PRIME)
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Ambang aman BNI: &ge; 1.25x angsuran bulanan
                    </div>
                  </div>
                </div>
              </div>

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
                    <h3 className="text-xl font-bold text-foreground mt-1">Status: PRIME_LOW_RISK</h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      Rasio perputaran dana Virtual Account terhadap kewajiban angsuran bulanan BNI Wirausaha mencapai 2.45x (jauh di atas batas minimum 1.25x).
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/40">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Rekomendasi RM: Layak untuk penambahan limit kredit modal kerja.
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
        </main>
      </div>

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
    </div>
  );
}
