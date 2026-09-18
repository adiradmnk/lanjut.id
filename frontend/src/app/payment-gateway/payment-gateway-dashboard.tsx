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
  const [uploadDone, setUploadDone] = useState(false);

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
          navGroups={gatewayNavGroups}
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
                {/* Checklist */}
                <div className="bg-[#212121] border border-white/10 rounded-xl p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-white mb-4">Syarat Persetujuan Merchant</h2>
                  {[
                    { label: 'Izin Usaha (SIUP/NIB)', done: true },
                    { label: 'NPWP Perusahaan', done: true },
                    { label: 'Rekening BNI Aktif', done: true },
                    { label: 'Katalog Produk & Harga', done: uploadDone, required: !uploadDone },
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
                      {item.required && (
                        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Wajib</span>
                      )}
                    </div>
                  ))}
                  {uploadDone && (
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[12px] text-emerald-400">AI membaca <strong>12 aturan harga</strong> & <strong>8 paket produk</strong></span>
                    </div>
                  )}
                </div>

                {/* Drag and Drop Upload */}
                <div className="bg-[#212121] border border-white/10 rounded-xl p-5 flex flex-col items-center justify-center gap-4">
                  <h2 className="text-sm font-semibold text-white self-start">Upload Katalog Produk</h2>
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); setUploadDone(true); }}
                    className={`w-full flex-1 min-h-[180px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all duration-500 ${
                      uploadDone
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/20 bg-white/3 hover:border-[#24B1B1]/50'
                    }`}
                  >
                    {uploadDone ? (
                      <>
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                        <div className="text-center">
                          <p className="text-sm font-semibold text-emerald-400">Katalog berhasil diunggah!</p>
                          <p className="text-xs text-emerald-300/70 mt-1">panduan_bisnis_fitbody.pdf · 2.4 MB</p>
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
                          onClick={() => setUploadDone(true)}
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
              {/* Stats - Borderless, Matching Background */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Merchant Terdaftar', value: '48', sub: 'SME aktif', color: 'text-[#24B1B1]' },
                  { label: 'VA Turnover Bulan Ini', value: 'Rp 342jt', sub: '+18% MoM', color: 'text-emerald-400' },
                  { label: 'NPL Rate Aktual', value: '0.42%', sub: 'Sangat sehat', color: 'text-emerald-400' },
                  { label: 'Proyeksi NPL Tanpa LANJUT', value: '3.18%', sub: '7.6× lebih tinggi', color: 'text-orange-400' },
                ].map(stat => (
                  <div key={stat.label} className="p-0">
                    <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-neutral-400 mt-1 font-medium">{stat.label}</div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Minimalist Line & Bar Charts - Zero Background, Zero Borders */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2 pb-2">
                {/* 1. VA Turnover Trendline */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Tren VA Turnover (6 Bln)</span>
                    <span className="text-emerald-400 font-mono text-[11px] font-semibold">Rp 342M (+42%)</span>
                  </div>
                  <div className="h-20 w-full flex items-end">
                    <svg className="w-full h-16 overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 0 50 Q 50 48, 100 38 T 200 24 T 300 8 L 300 60 L 0 60 Z"
                        fill="url(#gradientGreen)"
                      />
                      <path
                        d="M 0 50 Q 50 48, 100 38 T 200 24 T 300 8"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="300" cy="8" r="3" fill="#10b981" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-600 font-mono">
                    <span>Apr</span>
                    <span>Mei</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Agu</span>
                    <span>Sep</span>
                  </div>
                </div>

                {/* 2. NPL Mitigation Comparison */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">NPL Suppression Curve</span>
                    <span className="text-emerald-400 font-mono text-[11px] font-semibold">-2.76% Delta</span>
                  </div>
                  <div className="h-20 w-full flex items-end">
                    <svg className="w-full h-16 overflow-visible" viewBox="0 0 300 60" preserveAspectRatio="none">
                      {/* Tanpa LANJUT (Red/Orange dashed line) */}
                      <path
                        d="M 0 45 Q 60 40, 120 28 T 240 18 T 300 10"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      {/* Dengan LANJUT (Emerald solid line) */}
                      <path
                        d="M 0 45 Q 60 46, 120 48 T 240 50 T 300 52"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="300" cy="52" r="3" fill="#10b981" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-600 font-mono">
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block" /> Aktual (0.42%)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-orange-500 inline-block" /> Estimasi Tanpa Retensi (3.18%)</span>
                  </div>
                </div>

                {/* 3. Merchant Health Composition */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Komposisi Kesehatan Portofolio</span>
                    <span className="text-neutral-400 font-mono text-[11px]">48 Merchant</span>
                  </div>
                  {/* Slim horizontal stacked bar */}
                  <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-neutral-800 mt-5">
                    <div style={{ width: '75%' }} className="bg-emerald-500" title="Prime: 75%" />
                    <div style={{ width: '18%' }} className="bg-yellow-500" title="Watchlist: 18%" />
                    <div style={{ width: '7%' }} className="bg-red-500" title="High Alert: 7%" />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-3">
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Prime (36)</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Watchlist (9)</span>
                    <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> High Alert (3)</span>
                  </div>
                </div>
              </div>

              {/* Merchant Health Table - Borderless, Clean & Minimal */}
              <div className="pt-2">
                <div className="pb-3 flex items-center justify-between border-b border-white/5">
                  <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Merchant Health Overview</h3>
                  <span className="text-[10px] text-neutral-600 font-mono">Data per 18 Sep 2026</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-neutral-500 uppercase text-[10px] tracking-wider">
                        <th className="text-left py-3 font-medium">Merchant</th>
                        <th className="text-left py-3 font-medium">Risk Level</th>
                        <th className="text-left py-3 font-medium">Retention</th>
                        <th className="text-left py-3 font-medium">VA Turnover</th>
                        <th className="text-left py-3 font-medium">Rekomendasi RM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { name: 'FitBody Gym & Movement', id: 'mch-001', risk: 'WATCHLIST', retention: '88.4%', va: 'Rp 11.9jt', action: 'Monitor konversi AI retention' },
                        { name: 'Zenith Yoga Sanctuary', id: 'mch-002', risk: 'PRIME', retention: '94.2%', va: 'Rp 8.45jt', action: 'Tawarkan KUR Wirausaha BNI' },
                        { name: 'Surabaya Iron CrossFit', id: 'mch-003', risk: 'PRIME', retention: '91.0%', va: 'Rp 6.2jt', action: 'Eligible ekspansi cabang' },
                        { name: 'Bandung Core Pilates', id: 'mch-004', risk: 'HIGH_ALERT', retention: '72.1%', va: 'Rp 2.1jt', action: 'Intervensi RM segera ⚡' },
                      ].map(m => {
                        const riskColor = m.risk === 'PRIME'
                          ? 'text-emerald-400'
                          : m.risk === 'WATCHLIST'
                          ? 'text-yellow-400'
                          : 'text-red-400';
                        return (
                          <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 pr-4">
                              <div className="font-medium text-white">{m.name}</div>
                              <div className="text-[10px] text-neutral-600 font-mono">{m.id}</div>
                            </td>
                            <td className="py-3.5 pr-4">
                              <span className={`text-[10px] font-semibold uppercase tracking-wider ${riskColor}`}>{m.risk}</span>
                            </td>
                            <td className="py-3.5 pr-4 text-neutral-300">{m.retention}</td>
                            <td className="py-3.5 pr-4 text-neutral-300 font-mono">{m.va}</td>
                            <td className="py-3.5 text-neutral-400">{m.action}</td>
                          </tr>
                        );
                      })}
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
