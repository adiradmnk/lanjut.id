'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ReceiptText, RefreshCw, AlertCircle, LogOut } from 'lucide-react';
import RukitaCancelFlowModal from '@/components/rukita/RukitaCancelFlowModal';

const TENANT_ID = 'mch-rukita-01';
const DEFAULT_MEMBER_ID = 'mbr-rk-melati-01';

interface Transaction {
  trx_id: string;
  amount: number;
  status: string;
  session_title?: string;
  created_at: string;
  paid_at?: string | null;
}

interface Member {
  id: string;
  name: string;
  current_package: string;
}

const statusBadge: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

function RiwayatTransaksiContent() {
  const params = useSearchParams();
  const memberId = params.get('member_id') || DEFAULT_MEMBER_ID;

  const [member, setMember] = useState<Member | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, trxRes] = await Promise.all([
        fetch(`/api/merchant/${TENANT_ID}/at-risk-members`).then((r) => r.json()),
        fetch(`/api/member/transactions?member_id=${memberId}`).then((r) => r.json()),
      ]);
      const found = (membersRes.members || []).find((m: Member) => m.id === memberId) || null;
      setMember(found);
      setTransactions(trxRes.transactions || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  return (
    <div className="min-h-screen bg-[#fff7f2]">
      <header className="bg-white border-b border-orange-100 px-6 py-4 flex items-center gap-3">
        <Link href="/rukita" className="text-neutral-400 hover:text-neutral-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-black text-neutral-900">Riwayat Transaksi</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        {member && (
          <div className="bg-white rounded-2xl border border-orange-100 p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-neutral-900">{member.name}</p>
              <p className="text-[11px] text-neutral-500">{member.current_package}</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Pindah Kamar / Berhenti Sewa
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-orange-100 divide-y divide-orange-50">
          {loading ? (
            <div className="p-6 text-center text-sm text-neutral-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Memuat transaksi...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-400 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> Belum ada riwayat transaksi.
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.trx_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <ReceiptText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t.session_title || 'Sewa Bulanan'}</p>
                    <p className="text-[11px] text-neutral-400">{new Date(t.created_at).toLocaleString('id-ID')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900">
                    Rp {Number(t.amount).toLocaleString('id-ID')}
                  </p>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      statusBadge[t.status] || 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-[11px] text-neutral-400 text-center">
          Menekan &quot;Pindah Kamar / Berhenti Sewa&quot; memanggil endpoint backend sungguhan
          (<code>POST /api/member/subscription/:id/cancel</code>) yang memicu AI untuk menyusun pertanyaan dan
          rekomendasi retensi nyata — bukan simulasi tampilan.
        </p>
      </main>

      {member && (
        <RukitaCancelFlowModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          member={member}
          onResolved={loadData}
        />
      )}
    </div>
  );
}

export default function RiwayatTransaksiPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fff7f2]" />}>
      <RiwayatTransaksiContent />
    </Suspense>
  );
}
