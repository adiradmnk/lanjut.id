'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Terminal,
  Clock
} from 'lucide-react';

interface GatewayLogItem {
  id: string;
  transaction_id: string | null;
  provider: string;
  direction: 'REQUEST' | 'RESPONSE' | 'WEBHOOK';
  raw_payload: any;
  created_at: string;
}

export default function AuditLogsView() {
  const [logs, setLogs] = useState<GatewayLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'REQUEST' | 'RESPONSE' | 'WEBHOOK'>('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bni/gateway-logs');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
      }
    } catch (e) {
      console.warn('Gagal memuat log audit:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  const filtered = logs.filter(l => {
    const matchDir = filterDirection === 'ALL' || l.direction === filterDirection;
    const rawStr = JSON.stringify(l.raw_payload);
    const matchSearch = 
      (l.transaction_id && l.transaction_id.toLowerCase().includes(search.toLowerCase())) ||
      rawStr.toLowerCase().includes(search.toLowerCase());
    return matchDir && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#212121] border border-white/10 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Audit Trail Security
            </span>
            <span className="text-xs text-neutral-400">FASE 1b Payment Gateway Audits</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Jejak Audit Komunikasi Bank BNI SNAP (Zero Secret Leak)
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Semua payload transmisi API secara ketat disanitasi. Kredensial rahasia disimpan sebagai <code className="text-amber-400 font-mono">[REDACTED]</code>.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#212121] border border-white/10 rounded-xl p-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari TRX ID atau payload JSON..."
            className="w-full bg-[#171717] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          {(['ALL', 'REQUEST', 'RESPONSE', 'WEBHOOK'] as const).map(d => (
            <button
              key={d}
              onClick={() => setFilterDirection(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filterDirection === d
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#212121] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-neutral-400 uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="px-4 py-3">Arah Transmisi</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Terkait TRX ID</th>
                <th className="px-4 py-3">Payload Tersanitasi ([REDACTED])</th>
                <th className="px-4 py-3">Waktu Kejadian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px] text-neutral-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-500 font-sans">
                    Belum ada riwayat transmisi gateway yang tercatat.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      {l.direction === 'REQUEST' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          &rarr; OUTBOUND REQ
                        </span>
                      )}
                      {l.direction === 'RESPONSE' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          &larr; INBOUND RESP
                        </span>
                      )}
                      {l.direction === 'WEBHOOK' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          &darr; BNI WEBHOOK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">
                      {l.provider}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 font-medium">
                      {l.transaction_id || '<UNATTACHED>'}
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="truncate text-neutral-400 font-mono text-[10px] bg-[#171717] px-2 py-1 rounded border border-white/5">
                        {JSON.stringify(l.raw_payload)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-[10px]">
                      {new Date(l.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
