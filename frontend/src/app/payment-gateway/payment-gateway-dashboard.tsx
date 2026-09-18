'use client';

import React, { useState, useEffect, useRef } from 'react';
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

// Supervised Merchants badge reflects the real merchant count once loaded (see
// buildGatewayNavGroups below) — no static/fabricated number.
function buildGatewayNavGroups(supervisedMerchantsCount: number): NavGroupData[] {
  return [
    {
      items: [
        { id: 'search', title: 'Search Gateway', icon: Search, shortcut: '⌘K' },
        { id: 'home', title: 'Overview', icon: LayoutDashboard },
        {
          id: 'supervised-merchants',
          title: 'Supervised Merchants',
          icon: Building2,
          badge: supervisedMerchantsCount > 0 ? supervisedMerchantsCount : undefined,
        },
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
        { id: 'rm-support', title: 'RM Support Queue', icon: Users },
      ]
    },
    {
      heading: 'Developer Hub',
      items: [
        { id: 'snap-webhooks', title: 'Webhook Endpoints', icon: Blocks },
      ]
    }
  ];
}

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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const catalogFileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-[#171717] text-[#fafafa] font-sans antialiased overflow-hidden select-none">
      
      {/* 1. COLLAPSIBLE SIDEBAR */}
      <div 
        className={`h-full transition-all duration-300 ease-in-out shrink-0 overflow-hidden bg-[#171717] ${
          !sidebarCollapsed ? 'w-[260px] opacity-100' : 'w-0 opacity-0'
        }`}
      >
        <SidebarNav
          className="w-[260px] border-none bg-[#171717]"
          activeId={activeNav}
          onSelect={handleNavSelect}
          navGroups={buildGatewayNavGroups(merchants.length)}
          bottomItems={gatewayBottomItems}
          activeWorkspace="BNI Ecosystem Gateway"
          planLabel="Partner Portal v2.4"
          workspaces={['BNI Ecosystem Gateway', 'FitBody Gym', 'Sandbox Gateway']}
        />
      </div>

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#171717] relative z-10">
        
        {/* TOP BAR (Breadcrumb Only) */}
        <header className="h-12 border-b border-white/10 px-6 flex items-center shrink-0 bg-[#171717]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md hover:bg-[#2e2e2e]/50 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              title="Toggle Sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-[#a1a1a1]">
              <span className="text-white font-semibold">Payment Gateway</span>
              <span>/</span>
              <span className="capitalize text-white font-semibold">{activeNav.replace('-', ' ')}</span>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#171717]">
          {/* Home — Onboarding Checklist */}
          {activeNav === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h1 className="text-xl font-bold text-white">BNI Direct Partner Portal</h1>
                <p className="text-sm text-neutral-400 mt-1">Lengkapi persyaratan onboarding untuk mendapatkan approval BNI</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Checklist — no backend document-verification system exists yet, so legal
                    docs stay honestly "pending manual review" instead of pre-approved. */}
                <div className="bg-[#212121] border border-white/10 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-white mb-4">Syarat Persetujuan Merchant</h2>
                  {[
                    { label: 'Izin Usaha (SIUP/NIB)', done: false },
                    { label: 'NPWP Perusahaan', done: false },
                    { label: 'Rekening BNI Aktif', done: false },
                    { label: 'Katalog Produk & Harga', done: !!uploadedFile, required: !uploadedFile },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                        item.done
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : item.required
                          ? 'bg-orange-500/10 border-orange-500/40'
                          : 'bg-white/3 border-white/10'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        item.done ? 'bg-emerald-500' : 'border border-orange-500 bg-orange-500/20'
                      }`}>
                        {item.done ? (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-orange-400" />
                        )}
                      </div>
                      <span className={`text-[13px] font-medium ${
                        item.done ? 'text-emerald-400' : 'text-orange-400'
                      }`}>{item.label}</span>
                      <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                        {item.done ? 'Diterima' : 'Menunggu Verifikasi'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Drag and Drop Upload — captures the real dropped/selected file (name +
                    size); no backend endpoint exists yet to store/verify this document, so
                    it's shown as "received, pending verification" rather than "approved". */}
                <div className="bg-[#212121] border border-white/10 rounded-xl p-5 flex flex-col items-center justify-center gap-4">
                  <h2 className="text-sm font-semibold text-white self-start">Upload Katalog Produk</h2>
                  <input
                    ref={catalogFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setUploadedFile(file);
                    }}
                  />
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) setUploadedFile(file);
                    }}
                    className={`w-full flex-1 min-h-[180px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all duration-500 ${
                      uploadedFile
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/20 bg-white/3 hover:border-[#24B1B1]/50'
                    }`}
                  >
                    {uploadedFile ? (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-emerald-400">File diterima, menunggu verifikasi tim BNI</p>
                          <p className="text-xs text-emerald-300/70 mt-1">
                            {uploadedFile.name} · {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                          <span className="text-2xl">📄</span>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-neutral-300">Drag & drop dokumen panduan bisnis</p>
                          <p className="text-xs text-neutral-500 mt-1">PDF, DOCX, atau XLSX · Maks. 10 MB</p>
                        </div>
                        <button
                          onClick={() => catalogFileInputRef.current?.click()}
                          className="px-4 py-2 rounded-lg bg-[#007979] hover:bg-[#005f5f] text-white text-sm font-medium transition-colors cursor-pointer"
                        >
                          Pilih File
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Health */}
          {activeNav === 'portfolio-health' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* Stats - real portfolio aggregates from /api/bni/portfolio-health */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-0">
                  <div className="text-3xl font-bold tracking-tight text-[#24B1B1]">
                    {portfolio?.merchantCount ?? '—'}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 font-medium">Merchant Terdaftar</div>
                  <div className="text-[11px] text-neutral-600 mt-0.5">SME aktif dalam portofolio</div>
                </div>
                <div className="p-0">
                  <div className="text-3xl font-bold tracking-tight text-emerald-400">
                    {formatRupiah(portfolio?.monthlyTurnover ?? null)}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1 font-medium">VA Turnover Bulan Ini</div>
                  <div className="text-[11px] text-neutral-600 mt-0.5">Total settlement BNI VA</div>
                </div>
              </div>

              {/* Merchant Health Table - real merchant list from /api/bni/merchant-list */}
              <div className="pt-2">
                <div className="pb-3 flex items-center justify-between border-b border-white/5">
                  <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Merchant Health Overview</h3>
                  <span className="text-[10px] text-neutral-600 font-mono">{merchants.length} merchant</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-neutral-500 uppercase text-[10px] tracking-wider">
                        <th className="text-left py-3 font-medium">Merchant</th>
                        <th className="text-left py-3 font-medium">Kategori</th>
                        <th className="text-left py-3 font-medium">Credit Health Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {merchants.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-neutral-500">Belum ada data merchant.</td>
                        </tr>
                      ) : (
                        merchants.map(m => (
                          <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 pr-4">
                              <div className="font-medium text-white">{m.name}</div>
                              <div className="text-[10px] text-neutral-600 font-mono">{m.id}</div>
                            </td>
                            <td className="py-3.5 pr-4 text-neutral-300">{m.category || '—'}</td>
                            <td className="py-3.5 text-neutral-400">
                              {m.health?.creditHealthRating || m.health?.credit_health_rating || 'Belum dievaluasi'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Fallback placeholder for all other nav items */}
          {activeNav !== 'home' && activeNav !== 'portfolio-health' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] border border-dashed border-white/10 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white mb-4">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight capitalize">
                {activeNav.replace('-', ' ')}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Halaman ini telah dikosongkan dan siap untuk konfigurasi komponen gateway berikutnya.
              </p>
            </div>
          )}
        </div>

      </main>

      {/* ⌘K SEARCH MODAL */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#212121] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center px-4 py-3 border-b border-white/10">
              <Search className="w-4 h-4 text-neutral-400 mr-3" />
              <input
                type="text"
                autoFocus
                placeholder="Search gateway endpoints, logs, or merchants..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-[#a1a1a1] focus:outline-none"
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
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                const filtered = q === '' ? merchants : merchants.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
                if (filtered.length === 0) {
                  return <div className="px-3 py-4 text-center text-xs text-neutral-500">Tidak ada merchant yang cocok.</div>;
                }
                return filtered.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMerchantId(m.id);
                      setActiveNav('portfolio-health');
                      setSearchModalOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#24B1B1]" />
                      <span className="text-neutral-200 font-medium">{m.name}</span>
                    </div>
                    <span className="text-neutral-500 font-mono text-[10px]">{m.id}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
