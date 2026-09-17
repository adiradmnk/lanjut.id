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
        className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-[#09090b] ${
          !sidebarCollapsed ? 'w-[260px] opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <SidebarNav
          className="w-[260px] border-none bg-[#09090b]"
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
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090b] relative z-10">
        
        {/* TOP BAR (Breadcrumb Only) */}
        <header className="h-12 border-b border-white/10 px-6 flex items-center shrink-0 bg-[#09090b]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md hover:bg-white/5 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              title="Toggle Sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
              <span className="text-white font-semibold">Payment Gateway</span>
              <span>/</span>
              <span className="capitalize text-white font-semibold">{activeNav.replace('-', ' ')}</span>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN BODY */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Empty clean placeholder */}
          <div className="flex flex-col items-center justify-center min-h-[60vh] border border-dashed border-white/10 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight capitalize">
              {activeNav.replace('-', ' ')}
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Halaman ini telah dikosongkan dan siap untuk konfigurasi komponen gateway berikutnya.
            </p>
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
