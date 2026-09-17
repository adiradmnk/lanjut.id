'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Activity, Users, CheckCircle2, Clock, AlertTriangle, ArrowRight, X, Play } from 'lucide-react';

interface Dataset900AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Dataset900AuditModal({ isOpen, onClose }: Dataset900AuditModalProps) {
  const [summary, setSummary] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRunningStress, setIsRunningStress] = useState<boolean>(false);
  const [stressResult, setStressResult] = useState<any>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/merchant/dataset-900/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.metrics);
      }
    } catch (e) {
      console.warn('Gagal memuat summary 900 dataset:', e);
    }
  };

  const fetchMembers = async (filter = activeFilter, search = searchQuery) => {
    try {
      const res = await fetch(`/api/merchant/dataset-900/members?risk=${filter}&search=${encodeURIComponent(search)}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.warn('Gagal memuat members 900 dataset:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
      fetchMembers();
    }
  }, [isOpen]);

  const handleFilterChange = (filter: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
    setActiveFilter(filter);
    fetchMembers(filter, searchQuery);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMembers(activeFilter, searchQuery);
  };

  const handleRunBatchInference = async () => {
    setIsRunningStress(true);
    try {
      const res = await fetch('/api/merchant/dataset-900/run-stress-test', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStressResult(data.execution);
        fetchSummary();
        fetchMembers();
      }
    } catch (e) {
      console.error('Stress test failed:', e);
    } finally {
      setIsRunningStress(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-400 font-bold">
              900
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Audit Dataset Validasi Fungsional (900 Data Sintetis Sandbox)</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  Gym Population Stress Matrix
                </span>
              </div>
              <p className="text-xs text-neutral-300">
                Membuktikan ketahanan AI microservice, akurasi formula Attendance Velocity, dan otomasi BNI VA SNAP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Risk Persona Summary Cards */}
        <div className="p-6 border-b border-neutral-200/80 bg-neutral-50/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Total */}
            <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-sm">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Total Populasi Aktif</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-neutral-900">{summary?.total_active_members || 900}</span>
                <span className="text-xs text-neutral-500">Member</span>
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">1 Fasilitas Gym Menengah</span>
            </div>

            {/* Segmen 1: High */}
            <div className="p-3.5 bg-red-50/70 border border-red-200/80 rounded-2xl shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">1. Zona Merah</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-red-900">{summary?.distribution?.high_risk_critical || 300}</span>
                <span className="text-xs text-red-600 font-semibold">Member (~33%)</span>
              </div>
              <span className="text-[10px] text-red-700/80 mt-1 block">Drop streak 3-6 minggu &bull; Target BNI VA</span>
            </div>

            {/* Segmen 2: Medium */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl shadow-sm">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">2. Moderate Drift</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-950">{summary?.distribution?.medium_risk_drift || 300}</span>
                <span className="text-xs text-amber-700 font-semibold">Member (~33%)</span>
              </div>
              <span className="text-[10px] text-amber-800/80 mt-1 block">Kehadiran melambat &bull; Uji Smart Ranker</span>
            </div>

            {/* Segmen 3: Low */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl shadow-sm">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">3. Aman & Stabil</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-emerald-950">{summary?.distribution?.low_risk_stable || 300}</span>
                <span className="text-xs text-emerald-700 font-semibold">Member (~34%)</span>
              </div>
              <span className="text-[10px] text-emerald-800/80 mt-1 block">Kelompok kontrol &bull; Menjaga DSCR Bank</span>
            </div>
          </div>

          {/* Trigger Batch Stress Test Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-blue-50/80 border border-blue-200/90 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-950 block">Uji Stres 900 Batch AI Inference On-Demand</span>
                <span className="text-[11px] text-blue-700">
                  {stressResult
                    ? `Hasil Uji Terakhir: ${stressResult.summary?.total_processed} diproses dalam ${stressResult.gateway_roundtrip_ms || stressResult.summary?.processing_time_ms} ms (${stressResult.source})`
                    : 'Kirimkan 900 rekam jejak sekaligus ke microservice AI untuk menguji kecepatan latensi (< 150ms)'}
                </span>
              </div>
            </div>

            <button
              onClick={handleRunBatchInference}
              disabled={isRunningStress}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span>{isRunningStress ? 'Menjalankan Batch 900...' : 'Jalankan Batch Inference'}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => handleFilterChange('ALL')}
              className={`px-3 py-1.5 rounded-full transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Semua Populasi ({summary?.total_active_members || 900})
            </button>
            <button
              onClick={() => handleFilterChange('HIGH')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                activeFilter === 'HIGH'
                  ? 'bg-red-600 text-white'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              <span>Zona Merah</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
                {summary?.distribution?.high_risk_critical || 300}
              </span>
            </button>
            <button
              onClick={() => handleFilterChange('MEDIUM')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                activeFilter === 'MEDIUM'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <span>Moderate Drift</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
                {summary?.distribution?.medium_risk_drift || 300}
              </span>
            </button>
            <button
              onClick={() => handleFilterChange('LOW')}
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                activeFilter === 'LOW'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span>Aman / Kontrol</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-bold">
                {summary?.distribution?.low_risk_stable || 300}
              </span>
            </button>
          </div>

          <form onSubmit={handleSearch} className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID, nama, atau email member..."
              className="w-full px-3 py-1.5 text-xs bg-neutral-100 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
          </form>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100/90 text-neutral-600 font-bold uppercase text-[10px] tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Member ID & Nama</th>
                  <th className="py-2.5 px-4">Paket & Tier</th>
                  <th className="py-2.5 px-4">Utilisasi Kuota</th>
                  <th className="py-2.5 px-4">Sisa Hari Aktif</th>
                  <th className="py-2.5 px-4">AI Risk Classification</th>
                  <th className="py-2.5 px-4 text-right">Tindakan Otonom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/70">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{m.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{m.id} &bull; {m.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-neutral-800">{m.current_package}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-neutral-200/70 text-neutral-700">
                        {m.package_tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-800">
                        {m.used_quota} / {m.total_quota} Sesi
                      </div>
                      <div className="w-24 h-1.5 bg-neutral-200 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            m.churn_risk_flag === 'HIGH' ? 'bg-red-500' : m.churn_risk_flag === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.round((m.used_quota / Math.max(1, m.total_quota)) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 font-medium">
                      {Math.max(1, Math.round((new Date(m.active_until).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} Hari Lagi
                    </td>
                    <td className="py-3 px-4">
                      {m.churn_risk_flag === 'HIGH' ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px] inline-flex items-center gap-1 border border-red-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          <span>KRITIS (30-45d Absen)</span>
                        </span>
                      ) : m.churn_risk_flag === 'MEDIUM' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span>MODERATE DRIFT</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>STABIL (DSCR Safe)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`/member?member_id=${m.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 font-semibold inline-flex items-center gap-1 text-[11px] shadow-sm transition-all"
                      >
                        <span>Simulasi</span>
                        <ArrowRight className="w-3 h-3 text-neutral-400" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-neutral-400 text-center mt-3">
            Menampilkan sampel aktif 25 dari total {totalCount} member terfilter dalam sandbox.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kepatuhan Regulasi: Data anonim tanpa mengekspos PII individual ke pihak ketiga (UU PDP).</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white font-bold hover:bg-neutral-800 transition-colors"
          >
            Tutup Audit
          </button>
        </div>

      </div>
    </div>
  );
}
