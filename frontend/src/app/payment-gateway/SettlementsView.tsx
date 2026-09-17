'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  Download,
  Building2,
  DollarSign
} from 'lucide-react';

interface SettlementItem {
  id: string;
  memberName: string;
  amount: number | null;
  status: string;
  timestamp: string;
}

interface SettlementsViewProps {
  merchants: any[];
  selectedMerchantId: string;
  onSelectMerchant: (id: string) => void;
  statusFilterTarget?: 'ALL' | 'PAID' | 'PENDING';
}

export default function SettlementsView({
  merchants,
  selectedMerchantId,
  onSelectMerchant,
  statusFilterTarget = 'ALL',
}: SettlementsViewProps) {
  const [payments, setPayments] = useState<SettlementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>(statusFilterTarget);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/merchant/retention-logs?merchant_id=${encodeURIComponent(selectedMerchantId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setPayments(data.logs.map((l: any) => ({
            id: l.id,
            memberName: l.member_name || 'Member',
            amount: l.amount_idr || 0,
            status: l.bni_va_status || 'PAID_SETTLED',
            timestamp: l.timestamp || '—',
          })));
        }
      }
    } catch (e) {
      console.warn('Gagal memuat settlements:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 8000);
    return () => clearInterval(interval);
  }, [selectedMerchantId]);

  const filtered = payments.filter(p => {
    const isPaid = p.status === 'PAID_SETTLED';
    const matchStatus = 
      filter === 'ALL' || 
      (filter === 'PAID' && isPaid) ||
      (filter === 'PENDING' && !isPaid);
    const matchSearch = 
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.memberName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalSettled = payments
    .filter(p => p.status === 'PAID_SETTLED')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#212121] border border-white/10 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              BNI SNAP Direct Clearing
            </span>
            <span className="text-xs text-neutral-400">Escrow Virtual Account Clearing & Settlement</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Settlement & Rekonsiliasi Merchant BNI
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Pilih merchant binaan untuk memverifikasi perputaran dana dan status pelunasan Virtual Account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMerchantId}
            onChange={(e) => onSelectMerchant(e.target.value)}
            className="bg-[#171717] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none cursor-pointer"
          >
            {merchants.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchPayments}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Total Dana Masuk Terkliring
          </span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
            Rp {totalSettled.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1">
            <span>{payments.filter(p => p.status === 'PAID_SETTLED').length} transaksi berhasil diselesaikan</span>
          </div>
        </div>

        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Pending Virtual Account
          </span>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">
            {payments.filter(p => p.status === 'PENDING_VA').length} Tagihan
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-1">
            <span>Menunggu pembayaran via BNI Mobile Banking</span>
          </div>
        </div>

        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Frekuensi Kliring
          </span>
          <div className="text-xl font-bold text-white font-mono mt-1">
            T+0 Real-Time
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Integrasi SNAP Webhook Otomatis</span>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-[#212121] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-3 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari TRX ID atau nama member..."
              className="w-full bg-[#171717] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto">
            {(['ALL', 'PAID', 'PENDING'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filter === s
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'Semua' : s === 'PAID' ? 'Lunas (Settled)' : 'Pending'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-neutral-400 uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="px-4 py-3">ID Tagihan</th>
                <th className="px-4 py-3">Nama Member</th>
                <th className="px-4 py-3 text-right">Nominal (IDR)</th>
                <th className="px-4 py-3 text-center">Status BNI VA</th>
                <th className="px-4 py-3">Waktu Pelunasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans text-neutral-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    Tidak ada transaksi settlement yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-white font-medium">
                      {p.id}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 font-medium">
                      {p.memberName}
                    </td>
                    <td className="px-4 py-3 font-mono text-right text-white font-semibold">
                      Rp {(p.amount || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.status === 'PAID_SETTLED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          PAID SETTLED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <Clock className="w-3 h-3" />
                          PENDING VA
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-400 text-[11px]">
                      {p.timestamp}
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
