'use client';

import React from 'react';
import { 
  Users, 
  Sparkles, 
  TrendingUp, 
  CreditCard, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';

interface HomeTabProps {
  stats: {
    total_members: number;
    at_risk_members: number;
    saved_members: number;
    retention_rate_pct: number;
    total_revenue_paid_idr: number;
    avg_quota_utilization_pct: number;
    outreach_sent: number;
    magic_link_opened: number;
    va_settled: number;
  };
  tenantName: string;
  tenantCategory: string;
  onNavigate: (tabId: string) => void;
  onOpenDataset900?: () => void;
}

export default function HomeTab({
  stats,
  tenantName,
  tenantCategory,
  onNavigate,
  onOpenDataset900,
}: HomeTabProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#212121] border border-white/10 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/10 text-white border border-white/10">
              {tenantCategory}
            </span>
            <span className="text-xs text-neutral-400">Merchant AI Retention Intelligence</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            {tenantName}
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Sistem retensi otomatis aktif melindungi pendapatan bulanan dan kesehatan kredit BNI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDataset900 && (
            <button
              onClick={onOpenDataset900}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2e2e2e] hover:bg-[#3a3a3a] text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#24B1B1]" />
              Dataset 900 Audit
            </button>
          )}
          <button
            onClick={() => onNavigate('business-logic')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            Konfigurasi Business Logic
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Member Aktif</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-2">
            {stats.total_members.toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Utilisasi kuota rata-rata: <strong className="text-white">{stats.avg_quota_utilization_pct}%</strong>
          </div>
        </div>

        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Retention Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
            {stats.retention_rate_pct.toFixed(1)}%
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            <strong className="text-white">{stats.saved_members} member</strong> berhasil diselamatkan AI
          </div>
        </div>

        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Member Berisiko (At-Risk)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-2">
            {stats.at_risk_members}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            <button 
              onClick={() => onNavigate('inbox')}
              className="text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              Lihat Retention Inbox &rarr;
            </button>
          </div>
        </div>

        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">BNI VA Revenue Settled</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-2">
            Rp {(stats.total_revenue_paid_idr || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            <button
              onClick={() => onNavigate('finance')}
              className="text-white hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
            >
              Rekonsiliasi BNI VA &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retention Funnel & AI Interventions */}
        <div className="lg:col-span-2 bg-[#212121] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-white" />
              <h2 className="text-sm font-bold text-white">Aliran Intervensi Retensi AI Bulan Ini</h2>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">Live Sync</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-[#171717] border border-white/5 rounded-lg p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-neutral-400">Outreach Sent</span>
              <div className="text-xl font-bold text-white font-mono mt-1">{stats.outreach_sent}</div>
              <p className="text-[10px] text-neutral-500 mt-0.5">Penawaran personal terkirim</p>
            </div>
            <div className="bg-[#171717] border border-white/5 rounded-lg p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-neutral-400">Link Opened</span>
              <div className="text-xl font-bold text-white font-mono mt-1">{stats.magic_link_opened}</div>
              <p className="text-[10px] text-neutral-500 mt-0.5">Member meninjau tawaran</p>
            </div>
            <div className="bg-[#171717] border border-white/5 rounded-lg p-3 text-center">
              <span className="text-[10px] uppercase font-mono text-neutral-400">VA Settled</span>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{stats.va_settled}</div>
              <p className="text-[10px] text-neutral-500 mt-0.5">Berhasil bayar via BNI VA</p>
            </div>
          </div>

          <div className="p-3.5 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between text-xs">
            <span className="text-neutral-300">
              Tingkat konversi penyelamatan member saat ini berada pada <strong>{stats.retention_rate_pct.toFixed(1)}%</strong>.
            </span>
            <button
              onClick={() => onNavigate('analytics')}
              className="px-2.5 py-1 rounded bg-white text-black font-semibold hover:bg-neutral-200 transition-colors cursor-pointer shrink-0 ml-3"
            >
              Lihat Analitik
            </button>
          </div>
        </div>

        {/* Quick Links & Shortcuts */}
        <div className="bg-[#212121] border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-white" />
            <h2 className="text-sm font-bold text-white">Menu Cepat Operasional</h2>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate('business-logic')}
              className="w-full text-left p-3 rounded-lg bg-[#171717] hover:bg-[#282828] border border-white/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Business Logic Chatbot</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Ubah guardrail diskon & margin floor via bahasa alami.
              </p>
            </button>

            <button
              onClick={() => onNavigate('finance')}
              className="w-full text-left p-3 rounded-lg bg-[#171717] hover:bg-[#282828] border border-white/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>BNI Virtual Account Logs</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Cek status settlement {stats.va_settled} transaksi BNI VA.
              </p>
            </button>

            <button
              onClick={() => onNavigate('inbox')}
              className="w-full text-left p-3 rounded-lg bg-[#171717] hover:bg-[#282828] border border-white/5 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Retention Inbox Queue</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Kirim intervensi cerdas ke pelanggan berisiko tinggi.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
