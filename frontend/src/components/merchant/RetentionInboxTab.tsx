'use client';

import React, { useState } from 'react';
import { 
  Inbox, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  UserCheck, 
  Clock, 
  HelpCircle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface MemberItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  current_package: string;
  total_quota: number;
  used_quota: number;
  churn_risk_flag?: string;
  attendance_history?: string[];
  days_inactive?: number;
}

interface RetentionInboxTabProps {
  members: MemberItem[];
  tenantId: string;
  onOpenFeedbackDemo: () => void;
  onRefresh: () => void;
}

export default function RetentionInboxTab({
  members,
  tenantId,
  onOpenFeedbackDemo,
  onRefresh,
}: RetentionInboxTabProps) {
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const [sentOffers, setSentOffers] = useState<Record<string, boolean>>({});
  const [isSending, setIsSending] = useState(false);

  const atRiskMembers = members.filter(m => m.churn_risk_flag === 'HIGH');

  const handleSendOffer = async (memberId: string) => {
    setIsSending(true);
    // Simulasi pengiriman penawaran AI
    setTimeout(() => {
      setSentOffers(prev => ({ ...prev, [memberId]: true }));
      setIsSending(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#212121] border border-white/10 rounded-xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
              Autonomous Retention Queue
            </span>
            <span className="text-xs text-neutral-400">Pencegahan Churn Sebelum Pelanggan Berhenti</span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">
            Retention Action Inbox & Member Escalations
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Ditemukan <strong className="text-amber-400 font-semibold">{atRiskMembers.length} member berisiko tinggi</strong> yang memerlukan intervensi retensi cerdas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFeedbackDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
            Simulasi Survei Pembatalan
          </button>
        </div>
      </div>

      {/* Member List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: At-Risk Members */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            Daftar Member Berisiko Tinggi (Perlu Tindakan)
          </h2>

          {atRiskMembers.length === 0 ? (
            <div className="bg-[#212121] border border-white/10 rounded-xl p-8 text-center text-neutral-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">Semua member aktif dan terawat baik!</p>
              <p className="text-xs text-neutral-500 mt-1">Tidak ada anomali penurunan presensi yang terdeteksi.</p>
            </div>
          ) : (
            atRiskMembers.map((m) => {
              const isSent = sentOffers[m.id];
              const quotaLeft = Math.max(0, m.total_quota - m.used_quota);

              return (
                <div
                  key={m.id}
                  className="bg-[#212121] border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/10 border border-red-500/20 text-red-400">
                          HIGH CHURN RISK
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {m.email} &bull; {m.current_package}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-neutral-400 mt-2 font-mono">
                        <span>Sisa Kuota: <strong className="text-white">{quotaLeft}/{m.total_quota}</strong></span>
                        <span>&bull;</span>
                        <span>Terakhir Presensi: <strong className="text-amber-400">3 minggu lalu</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSent ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Tawaran AI Terkirim
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendOffer(m.id)}
                          disabled={isSending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                          Kirim Intervensi AI
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: AI Retention Strategy Summary */}
        <div className="space-y-4">
          <div className="bg-[#212121] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-bold text-white">Prinsip Intervensi Retensi AI</h2>
            </div>
            
            <p className="text-xs text-neutral-400 leading-relaxed">
              Ketika member berhenti hadir selama 14-21 hari, sistem secara otomatis mengekstrak pola preferensi dan menerbitkan penawaran penyelamatan:
            </p>

            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <span><strong>Shift Jadwal:</strong> Tawaran pindah ke kelas weekend/malam tanpa biaya tambahan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <span><strong>Diskon Terkendali:</strong> Diskon hingga batas maksimal margin floor perbankan BNI.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                <span><strong>Free Freeze:</strong> Opsi penundaan paket selama 30 hari untuk member sibuk.</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={onOpenFeedbackDemo}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                Uji Coba Alur Pembatalan Member
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
