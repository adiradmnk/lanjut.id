'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  ArrowUpRight,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface TransactionItem {
  trx_id: string;
  merchant_id: string;
  member_id: string;
  session_id: string;
  session_title: string;
  amount: number;
  bni_va_number: string;
  bni_signature: string;
  status: string;
  created_at: string;
  paid_at?: string;
  customer_name?: string;
}

interface FinanceTabProps {
  tenantId: string;
  tenantName: string;
  bniAccountNumber?: string;
  bniCompanyCode?: string;
}

export default function FinanceTab({
  tenantId,
  tenantName,
  bniAccountNumber = '0129883492',
  bniCompanyCode = '8241',
}: FinanceTabProps) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/merchant/${tenantId}/transactions`);
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.warn('Gagal memuat riwayat transaksi:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const filtered = transactions.filter(t => {
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchSearch = 
      t.trx_id.toLowerCase().includes(search.toLowerCase()) ||
      t.bni_va_number.includes(search) ||
      t.session_title.toLowerCase().includes(search.toLowerCase()) ||
      t.member_id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalSettled = transactions
    .filter(t => t.status === 'PAID')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const pendingSettlement = transactions
    .filter(t => t.status === 'PENDING')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const handleExportCsv = () => {
    const header = 'Transaction_ID,Member_ID,Session_Title,BNI_VA_Number,Amount_IDR,Status,Created_At,Paid_At\n';
    const rows = transactions.map(t => 
      `"${t.trx_id}","${t.member_id}","${t.session_title}","${t.bni_va_number}",${t.amount},"${t.status}","${t.created_at}","${t.paid_at || '-'}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BNI_VA_Transactions_${tenantId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#212121] border border-white/10 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              BNI SNAP Direct Integration
            </span>
            <span className="text-xs text-neutral-400">Virtual Account Settlement Engine</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Riwayat Transaksi & Rekonsiliasi VA ({tenantName})
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Nomor Rekening Escrow BNI: <strong className="text-white font-mono">{bniAccountNumber}</strong> (Company Code: {bniCompanyCode})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Total Dana Lunas (Settled)
          </span>
          <div className="text-xl font-bold text-white font-mono mt-1">
            Rp {totalSettled.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{transactions.filter(t => t.status === 'PAID').length} transaksi lunas via BNI SNAP</span>
          </div>
        </div>

        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Tagihan Pending (VA Aktif)
          </span>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">
            Rp {pendingSettlement.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400/80 mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{transactions.filter(t => t.status === 'PENDING').length} VA menunggu pembayaran nasabah</span>
          </div>
        </div>

        <div className="bg-[#212121] border border-white/10 rounded-xl p-4">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Digital Signature Security
          </span>
          <div className="text-sm font-semibold text-white mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>HMAC-SHA256 v2 Validated</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Signature tersanitasi otomatis & bebas kebocoran API Key.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#212121] border border-white/10 rounded-xl p-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari TRX ID, VA, atau judul sesi..."
            className="w-full bg-[#171717] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-neutral-500 outline-none focus:border-white/30"
          />
        </div>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          {(['ALL', 'PAID', 'PENDING'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === s 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'Semua' : s === 'PAID' ? 'Lunas (Settled)' : 'Pending VA'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#212121] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-neutral-400 uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="px-4 py-3">TRX ID</th>
                <th className="px-4 py-3">Member Ref</th>
                <th className="px-4 py-3">Layanan / Sesi</th>
                <th className="px-4 py-3">BNI Virtual Account</th>
                <th className="px-4 py-3 text-right">Nominal (IDR)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Waktu Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans text-neutral-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                    Tidak ada data transaksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.trx_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-white">
                      {t.trx_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-400">
                      {t.member_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate">
                      {t.session_title}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-300">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {t.bni_va_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-right font-semibold text-white">
                      Rp {t.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.status === 'PAID' ? (
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
                    <td className="px-4 py-3 text-neutral-400 font-mono text-[11px]">
                      {t.paid_at 
                        ? new Date(t.paid_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                        : new Date(t.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                      }
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
