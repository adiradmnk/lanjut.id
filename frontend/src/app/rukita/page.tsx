'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Wifi, ShieldCheck, ReceiptText, ChevronRight, MapPin, Calendar } from 'lucide-react';

const TENANT_ID = 'mch-rukita-01';

interface Member {
  id: string;
  name: string;
  current_package: string;
  active_until?: string;
  used_quota: number;
  total_quota: number;
  churn_risk_flag: string;
}

// Dummy Rukita-branded tenant portal home. Cosmetic only — the member/room data underneath
// is the real backend (mch-rukita-01 seeded in the same generic tenant schema as every
// other merchant), fetched with no mock layer in between.
export default function RukitaHomePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/merchant/${TENANT_ID}/at-risk-members`)
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#fff7f2]">
      <header className="bg-white border-b border-orange-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black">R</div>
          <span className="font-black text-lg text-neutral-900">rukita</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold uppercase">
            Demo Tenant Portal
          </span>
        </div>
        <Link
          href="/rukita/riwayat-transaksi"
          className="text-xs font-bold text-orange-700 hover:text-orange-800 flex items-center gap-1"
        >
          Riwayat Transaksi <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-neutral-900">Selamat datang kembali 👋</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Kelola kamar, sewa bulanan, dan pengajuan pindah kamar Anda di sini.
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-neutral-400">Memuat data penyewa...</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {members.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                      <Home className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-neutral-900">{m.name}</p>
                      <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {m.current_package}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      m.churn_risk_flag === 'HIGH'
                        ? 'bg-rose-100 text-rose-700'
                        : m.churn_risk_flag === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {m.churn_risk_flag}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Jatuh tempo {m.active_until || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> WiFi + AC termasuk
                  </span>
                </div>

                <Link
                  href={`/rukita/riwayat-transaksi?member_id=${m.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-700"
                >
                  <ReceiptText className="w-3.5 h-3.5" /> Lihat riwayat transaksi &amp; kelola sewa
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>
            Situs demo untuk simulasi merchant Rukita — setiap aksi memanggil API backend &amp; AI engine yang
            sesungguhnya, bukan data palsu di sisi tampilan.
          </span>
        </div>
      </main>
    </div>
  );
}
