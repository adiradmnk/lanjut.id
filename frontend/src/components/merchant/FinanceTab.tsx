'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

export interface TransactionItem {
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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Sorting
  const [sortField, setSortField] = useState<keyof TransactionItem>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/merchant/${tenantId}/transactions`);
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
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

  const handleExportCsv = () => {
    const header = 'Transaction_ID,Member_ID,Session_Title,BNI_VA_Number,Amount_IDR,Status,Created_At,Paid_At\n';
    const rows = sortedTransactions.map(t => 
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

  // Sort Logic
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortField, sortOrder]);

  const toggleSort = (field: keyof TransactionItem) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const isAllSelected = sortedTransactions.length > 0 &&
    sortedTransactions.every(t => selectedIds[t.trx_id]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      sortedTransactions.forEach(t => {
        next[t.trx_id] = true;
      });
      setSelectedIds(next);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header - Borderless & Clean */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">Riwayat Transaksi Virtual Account</h2>
          <span className="text-[11px] text-neutral-500 font-mono">
            {sortedTransactions.length} transaksi
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer font-medium"
          >
            <Download className="w-3 h-3" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Pure Table - Zero Card Background, Zero Border Containers */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/5 hover:bg-transparent">
              <TableHead className="w-8 px-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('trx_id')} 
                className="cursor-pointer select-none text-[10px] font-mono text-neutral-500 hover:text-white uppercase tracking-wider py-3 px-3"
              >
                <div className="flex items-center gap-1">
                  <span>TRX ID</span>
                  {sortField === 'trx_id' && (
                    sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </div>
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('member_id')} 
                className="cursor-pointer select-none text-[10px] font-mono text-neutral-500 hover:text-white uppercase tracking-wider py-3 px-3"
              >
                <div className="flex items-center gap-1">
                  <span>Member Ref</span>
                  {sortField === 'member_id' && (
                    sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </div>
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('session_title')} 
                className="cursor-pointer select-none text-[10px] font-mono text-neutral-500 hover:text-white uppercase tracking-wider py-3 px-3"
              >
                <div className="flex items-center gap-1">
                  <span>Layanan / Sesi</span>
                  {sortField === 'session_title' && (
                    sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider py-3 px-3">
                BNI Virtual Account
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('amount')} 
                className="cursor-pointer select-none text-[10px] font-mono text-neutral-500 hover:text-white uppercase tracking-wider text-right py-3 px-3"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Nominal (IDR)</span>
                  {sortField === 'amount' && (
                    sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </div>
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('status')} 
                className="cursor-pointer select-none text-[10px] font-mono text-neutral-500 hover:text-white uppercase tracking-wider py-3 px-3"
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortField === 'status' && (
                    sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </div>
              </TableHead>
              <TableHead 
                onClick={() => toggleSort('created_at')} 
                className="cursor-pointer select-none text-[10px] font-mono text-neutral-500 hover:text-white uppercase tracking-wider py-3 px-3"
              >
                <div className="flex items-center gap-1">
                  <span>Waktu</span>
                  {sortField === 'created_at' && (
                    sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/5">
            {sortedTransactions.length > 0 ? (
              sortedTransactions.map((row) => (
                <TableRow
                  key={row.trx_id}
                  className="hover:bg-white/[0.02] transition-colors border-none"
                >
                  <TableCell className="px-2 py-3">
                    <Checkbox
                      checked={!!selectedIds[row.trx_id]}
                      onCheckedChange={(checked) => {
                        setSelectedIds(prev => ({ ...prev, [row.trx_id]: !!checked }));
                      }}
                    />
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div className="font-mono text-white text-xs">{row.trx_id}</div>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div>
                      <div className="font-mono text-neutral-300 text-xs">{row.member_id}</div>
                      {row.customer_name && (
                        <div className="text-[11px] text-neutral-500">{row.customer_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div className="text-white max-w-[220px] truncate text-xs">
                      {row.session_title}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <span className="font-mono text-neutral-400 text-xs">
                      {row.bni_va_number}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div className="font-mono text-right font-medium text-white text-xs">
                      Rp {row.amount.toLocaleString("id-ID")}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    {row.status === "PAID" && (
                      <span className="text-[11px] font-medium text-emerald-400">
                        PAID SETTLED
                      </span>
                    )}
                    {row.status === "EXPIRED" && (
                      <span className="text-[11px] font-medium text-red-400">
                        EXPIRED
                      </span>
                    )}
                    {row.status !== "PAID" && row.status !== "EXPIRED" && (
                      <span className="text-[11px] font-medium text-amber-400">
                        PENDING VA
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 px-3">
                    <div className="text-neutral-500 font-mono text-[11px]">
                      {row.paid_at || row.created_at
                        ? new Date(row.paid_at || row.created_at).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short"
                          })
                        : "—"}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-neutral-500">
                  Tidak ada data transaksi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
