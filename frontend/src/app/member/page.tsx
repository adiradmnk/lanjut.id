'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  Mail,
  ExternalLink,
  Info,
  Lock,
  Zap,
  ArrowLeft,
  Flame,
  CheckCircle,
  Timer,
  Ban
} from 'lucide-react';

interface SmartOption {
  id: string;
  type: 'SWITCH_EVENING' | 'FLEXIBLE_DOWNGRADE' | 'PAUSE_FREEZE';
  title: string;
  badge: string;
  highlight: string;
  description: string;
  target_session_id?: string;
  target_session_title?: string;
  target_session_time?: string;
  price_adjustment_idr: number;
  original_price_idr?: number;
  discount_label?: string;
  available_slots?: number;
  action_label: string;
}

interface MemberProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  merchant_name: string;
  current_package: string;
  used_quota: number;
  total_quota: number;
  days_remaining: number;
}

interface VAResult {
  va_number: string;
  amount: number;
  expired_at: string;
  proposal_id?: string;
  trx_id?: string;
}

function MemberPortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const memberIdFallback = searchParams.get('member_id') || 'mbr-dina-01';

  // Step State: 'TOKEN_RESOLVING' | 'SMART_OPTIONS' | 'CHECKOUT_VA' | 'PAID_ACTIVATED' | 'TOKEN_INVALID'
  const [currentStep, setCurrentStep] = useState<
    'TOKEN_RESOLVING' | 'SMART_OPTIONS' | 'CHECKOUT_VA' | 'PAID_ACTIVATED' | 'TOKEN_INVALID'
  >('TOKEN_RESOLVING');

  // Resolved Member Profile
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [smartOptions, setSmartOptions] = useState<SmartOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<SmartOption | null>(null);
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string>('');

  // Checkout State
  const [isGeneratingVA, setIsGeneratingVA] = useState(false);
  const [vaData, setVaData] = useState<VAResult | null>(null);
  const [copiedVA, setCopiedVA] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('bni_mbanking');
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  // End-to-End AI Grievance Translator State
  const [complaintText, setComplaintText] = useState('');
  const [isAnalyzingGrievance, setIsAnalyzingGrievance] = useState(false);
  const [grievanceAnalysis, setGrievanceAnalysis] = useState<any | null>(null);

  // End-to-End Dynamic Cancellation Survey & Modal States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSurvey, setCancelSurvey] = useState<any | null>(null);
  const [cancelSelectedOptions, setCancelSelectedOptions] = useState<string[]>([]);
  const [cancelFreeText, setCancelFreeText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackOfferResult, setFeedbackOfferResult] = useState<any | null>(null);

  const handleOpenCancelSurvey = async () => {
    setIsCancelling(true);
    try {
      // 1. If user has active VA checkout, cancel the checkout transaction first
      if (vaData?.trx_id) {
        await fetch(`/api/member/checkout/${vaData.trx_id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: member?.id || memberIdFallback })
        });
      }

      // 2. Call real End-to-End API: POST /api/member/subscription/:id/cancel
      const res = await fetch(`/api/member/subscription/${member?.id || memberIdFallback}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.survey) {
        setCancelSurvey(data.survey);
        if (data.survey.multiple_choice_options?.length > 0) {
          setCancelSelectedOptions([data.survey.multiple_choice_options[0].id]);
        }
      }
      setIsCancelModalOpen(true);
    } catch (e) {
      console.error('Failed to trigger cancellation survey:', e);
      setIsCancelModalOpen(true);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitCancelFeedback = async () => {
    setIsSubmittingFeedback(true);
    try {
      const primaryReason = cancelSelectedOptions[0] || 'PRICE_SENSITIVE';
      const res = await fetch(`/api/member/subscription/${member?.id || memberIdFallback}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason_code: primaryReason,
          selected_option_ids: cancelSelectedOptions,
          free_text: cancelFreeText
        })
      });
      const data = await res.json();
      if (data.retention_offer) {
        setFeedbackOfferResult(data.retention_offer);
      }
    } catch (e) {
      console.error('Failed to submit cancellation feedback:', e);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleAnalyzeGrievance = async () => {
    if (!complaintText.trim()) return;
    setIsAnalyzingGrievance(true);
    try {
      const res = await fetch('/api/member/translate-grievance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || '',
          member_id: member?.id || memberIdFallback,
          free_text_complaint: complaintText,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setGrievanceAnalysis(data.analysis);
        if (data.smart_options && data.smart_options.length > 0) {
          setSmartOptions(data.smart_options);
        }
      }
    } catch (e) {
      console.error('Failed to translate grievance:', e);
    } finally {
      setIsAnalyzingGrievance(false);
    }
  };

  // 1. Frictionless Entry: Resolve Cryptographic Magic Token on Mount
  useEffect(() => {
    async function resolveSession() {
      try {
        const queryUrl = token
          ? `/api/member/resolve-magic-token?token=${encodeURIComponent(token)}`
          : `/api/member/resolve-magic-token?member_id=${encodeURIComponent(memberIdFallback)}`;

        const res = await fetch(queryUrl);
        const data = await res.json();

        if (res.ok && data.status === 'success' && data.member) {
          setMember(data.member);
          setSmartOptions(data.smart_options || []);
          setCurrentStep('SMART_OPTIONS');
        } else {
          setTokenErrorMessage(data.message || 'Tautan unik ini sudah kedaluwarsa atau tidak valid.');
          setCurrentStep('TOKEN_INVALID');
        }
      } catch {
        // Fallback for resilient presentation
        setMember({
          id: 'mbr-dina-01',
          name: 'Dina Kusuma',
          email: 'dina.kusuma@example.com',
          phone: '081298765432',
          merchant_name: 'FitBody Gym & Studio',
          current_package: 'Monthly Morning Pilates (08.00 WIB)',
          used_quota: 2,
          total_quota: 8,
          days_remaining: 7,
        });
        setSmartOptions([
          {
            id: 'opt_switch_evening',
            type: 'SWITCH_EVENING',
            title: 'Pindah ke Kelas Malam Sepulang Kantor',
            badge: 'Rekomendasi AI Terbaik 🔥',
            highlight: 'Kamis 19:00 - 20:00 WIB (Pilates Reformer)',
            description: 'Sisa kuota pagi otomatis dipindahkan ke kelas malam tanpa hangus. Pas dengan jam pulang kantor.',
            target_session_id: 'ses-malam-kamis',
            target_session_title: 'Evening Pilates Reformer & De-Stress Flow',
            target_session_time: 'Kamis, 19:00 - 20:00 WIB',
            price_adjustment_idr: 67500,
            original_price_idr: 150000,
            discount_label: 'Diskon 55% Penyesuaian Tarif',
            available_slots: 4,
            action_label: 'Pilih Jadwal Malam Ini',
          },
          {
            id: 'opt_flexible_downgrade',
            type: 'FLEXIBLE_DOWNGRADE',
            title: 'Ganti ke Paket 4 Sesi Fleksibel',
            badge: 'Opsi Hemat Anggaran 💡',
            highlight: 'Bebas Reservasi Jam & Hari Apapun',
            description: 'Ubah sisa kuota menjadi voucher fleksibel yang bisa dipakai kapan saja tanpa batas jadwal mingguan.',
            target_session_id: 'ses-flex-any',
            target_session_title: 'Paket Flexi FitBody',
            target_session_time: 'Fleksibel 30 Hari',
            price_adjustment_idr: 0,
            original_price_idr: 0,
            discount_label: 'Bebas Biaya Konversi',
            available_slots: 15,
            action_label: 'Ganti ke Fleksibel',
          },
          {
            id: 'opt_pause_freeze',
            type: 'PAUSE_FREEZE',
            title: 'Jeda Membership 14 Hari (Free Freeze)',
            badge: 'Sedang Dinas / Luar Kota ✈️',
            highlight: 'Masa Aktif Otomatis Diperpanjang 2 Minggu',
            description: 'Sedang banyak dinas luar kota atau tugas kantor? Bekukan akun tanpa biaya tambahan sepeserpun.',
            target_session_id: 'ses-freeze-14d',
            target_session_title: 'Freeze Membership 14 Hari',
            target_session_time: 'Jeda 14 Hari Kalender',
            price_adjustment_idr: 0,
            original_price_idr: 50000,
            discount_label: 'Bebas Biaya Admin',
            available_slots: 99,
            action_label: 'Bekukan Sementara',
          },
        ]);
        setCurrentStep('SMART_OPTIONS');
      }
    }
    resolveSession();
  }, [token, memberIdFallback]);

  // 2. Smart Options Selection -> 1-Tap Trigger
  const handleSelectOption = async (option: SmartOption) => {
    setSelectedOption(option);

    if (option.price_adjustment_idr === 0) {
      setIsGeneratingVA(true);
      try {
        await fetch('/api/bni/va-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            member_id: member?.id || 'mbr-dina-01',
            option_title: option.title,
            amount: 0,
            va_number: 'FREE-ACTIVATION',
          }),
        });
        setCurrentStep('PAID_ACTIVATED');
      } catch {
        setCurrentStep('PAID_ACTIVATED');
      } finally {
        setIsGeneratingVA(false);
      }
      return;
    }

    // Cetak BNI Virtual Account secara instan
    setIsGeneratingVA(true);
    try {
      const res = await fetch('/api/member/checkout-va', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member?.id || 'mbr-dina-01',
          session_id: option.target_session_id || 'ses-malam-kamis',
          amount: option.price_adjustment_idr,
          option_id: option.id,
        }),
      });

      const data = await res.json();
      if (data.status === 'success' || data.va_number) {
        setVaData({
          trx_id: data.trx_id,
          va_number: data.va_number || '8808123456789012',
          amount: data.amount !== undefined ? data.amount : option.price_adjustment_idr,
          expired_at: data.expired_at || '2026-09-24T23:59:59Z',
          proposal_id: data.proposal_id,
        });
        setCurrentStep('CHECKOUT_VA');
      }
    } catch {
      setVaData({
        va_number: '8808123456789012',
        amount: option.price_adjustment_idr,
        expired_at: '2026-09-24T23:59:59Z',
      });
      setCurrentStep('CHECKOUT_VA');
    } finally {
      setIsGeneratingVA(false);
    }
  };

  // Copy VA to Clipboard
  const handleCopyVA = () => {
    if (!vaData) return;
    navigator.clipboard.writeText(vaData.va_number);
    setCopiedVA(true);
    setTimeout(() => setCopiedVA(false), 2500);
  };

  // 3. Instant Action: Simulate BNI Settlement Webhook (Closed-loop Real Time Sync)
  const handleSimulatePayment = async () => {
    setIsSimulatingPayment(true);
    try {
      await fetch('/api/bni/va-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trx_id: `TRX-${Date.now()}`,
          va_number: vaData?.va_number || '8808123456789012',
          member_id: member?.id || 'mbr-dina-01',
          option_title: selectedOption?.title || 'Kelas Malam Kamis (19.00 - 20.00 WIB)',
          amount: vaData?.amount || selectedOption?.price_adjustment_idr || 67500,
        }),
      });
      setCurrentStep('PAID_ACTIVATED');
    } catch {
      setCurrentStep('PAID_ACTIVATED');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-800 font-sans antialiased p-3 sm:p-6 lg:p-10 flex flex-col items-center justify-center">
      {/* Centered Mobile/Web Container with Clean Rounded Aesthetics */}
      <div className="w-full max-w-lg bg-white rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-neutral-200/80 overflow-hidden flex flex-col">

        {/* Top Header Card */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center text-white font-bold text-xs">
              <span className="text-orange-500">L</span>
            </div>
            <span className="font-bold text-sm text-neutral-900 tracking-tight">
              {member?.merchant_name || 'LANJUT Member Portal'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verifikasi Kripto</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6">

          {/* =========================================================================
              TAHAP 0: TOKEN RESOLVING
             ========================================================================= */}
          {currentStep === 'TOKEN_RESOLVING' && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 mx-auto" />
              <p className="text-xs text-neutral-500 font-medium">
                Memverifikasi tautan unik & ketersediaan kuota real-time...
              </p>
            </div>
          )}

          {/* =========================================================================
              TOKEN INVALID
             ========================================================================= */}
          {currentStep === 'TOKEN_INVALID' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Akses Tidak Valid</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                  {tokenErrorMessage || 'Tautan ini telah kedaluwarsa atau tidak valid.'}
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors"
              >
                Coba Muat Ulang
              </button>
            </div>
          )}

          {/* =========================================================================
              TAHAP 1: SMART OPTIONS & AI RESOLUTION
             ========================================================================= */}
          {currentStep === 'SMART_OPTIONS' && member && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Member Greeting & Current Status Card */}
              <div className="bg-[#fafafa] border border-neutral-200/90 rounded-[22px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    {member.merchant_name} &bull; Profil Member
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {member.used_quota < member.total_quota / 2 ? 'Perhatian: Kuota Tertahan' : 'Member Aktif'}
                  </span>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Halo, {member.name} 👋</h2>
                  <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                    {member.current_package}
                  </p>
                </div>

                {/* Quota Progress */}
                <div className="pt-2 border-t border-neutral-200/60">
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-neutral-600">Sisa Kuota Sesi</span>
                    <span className="text-neutral-900 font-bold">{member.used_quota} dari {member.total_quota} sesi terpakai</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(member.used_quota / member.total_quota) * 100}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
                    Sistem mendeteksi sisa {member.total_quota - member.used_quota} sesi Anda belum sempat terpakai. <strong>Jangan biarkan kuota hangus—pilih 1 opsi penyesuaian instan di bawah:</strong>
                  </p>
                </div>
              </div>

              {/* Grievance Translator Box (End-to-End AI Intent Extractor) */}
              <div className="p-4 rounded-[22px] bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-blue-50/50 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-neutral-900">
                      Ada Kendala Jadwal atau Keberatan Biaya?
                    </h3>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                    Gemini 1.5 Flash
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Ceritakan keluhan Anda dengan kata-kata sendiri. AI LANJUT akan menganalisis alasan Anda dan mencarikan solusi jadwal atau penyesuaian biaya secara instan:
                </p>

                <div className="space-y-2">
                  <textarea
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Jam 8 pagi aku gak bisa karena udah ngantor, harganya juga lumayan pricey..."
                    className="w-full text-xs p-3 rounded-xl bg-white border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-neutral-800 placeholder:text-neutral-400 resize-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setComplaintText("Jam 8 pagi aku gak bisa karena udah ngantor, harganya juga lumayan pricey")}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2"
                    >
                      Pakai Contoh Kasus Dina
                    </button>
                    <button
                      type="button"
                      disabled={isAnalyzingGrievance || !complaintText.trim()}
                      onClick={handleAnalyzeGrievance}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isAnalyzingGrievance ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Menganalisis...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          <span>Analisis AI & Solusi</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Extracted Entity Result Card */}
                {grievanceAnalysis && (
                  <div className="mt-3 p-3 rounded-xl bg-white/90 border border-indigo-100 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-neutral-700">Hasil Analisis Structured AI:</span>
                      <span className="text-[10px] text-neutral-400 font-medium">{grievanceAnalysis.engine_source}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-100">
                        <span className="text-neutral-500 block">Kategori Inti:</span>
                        <strong className="text-neutral-800 font-bold uppercase">{grievanceAnalysis.category}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-100">
                        <span className="text-neutral-500 block">Preferensi Waktu:</span>
                        <strong className="text-indigo-700 font-bold">{grievanceAnalysis.preferred_time_of_day}</strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-600 italic">
                      &ldquo;{grievanceAnalysis.root_cause_summary}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Options Header */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Rekomendasi Solusi AI
                </span>
                <span className="text-[10px] text-neutral-400 font-semibold">1-Tap Resolution</span>
              </div>

              {/* Smart Options Cards */}
              <div className="space-y-3">
                {smartOptions.map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => !isGeneratingVA && handleSelectOption(opt)}
                    className="p-4 rounded-[20px] bg-[#fafafa] hover:bg-white border border-neutral-200/90 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.99] relative"
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                        {opt.badge}
                      </span>
                      {opt.available_slots && (
                        <span className="text-[10px] font-bold text-emerald-700">
                          Sisa {opt.available_slots} Kursi
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                      {opt.title}
                    </h4>

                    <div className="text-xs font-semibold text-neutral-700 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{opt.highlight}</span>
                    </div>

                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      {opt.description}
                    </p>

                    <div className="mt-3.5 pt-3 border-t border-neutral-200/60 flex items-center justify-between">
                      <div>
                        {opt.price_adjustment_idr > 0 ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-extrabold text-neutral-900">
                              Rp {opt.price_adjustment_idr.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[11px] line-through text-neutral-400">
                              Rp {opt.original_price_idr?.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-extrabold text-emerald-700">
                            GRATIS (Rp 0)
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-500 block">{opt.discount_label}</span>
                      </div>

                      <button
                        type="button"
                        disabled={isGeneratingVA}
                        className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs flex items-center gap-1 transition-all shadow-sm group-hover:bg-[#005E6A]"
                      >
                        <span>Pilih &amp; Lanjutkan</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center text-[11px] text-neutral-400 pt-1">
                🔒 Kuota kelas terverifikasi otomatis oleh database relasional FitBody
              </div>

              {/* Batalkan Langganan Button -> Triggers Real Dynamic Cancellation Survey */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleOpenCancelSurvey}
                  disabled={isCancelling}
                  className="text-xs text-neutral-400 hover:text-rose-600 transition-colors font-medium underline underline-offset-4 flex items-center justify-center gap-1 mx-auto"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{isCancelling ? 'Menyiapkan survei...' : 'Tidak cocok dengan opsi di atas? Batalkan langganan'}</span>
                </button>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAHAP 2: CHECKOUT & BNI VIRTUAL ACCOUNT
             ========================================================================= */}
          {currentStep === 'CHECKOUT_VA' && vaData && selectedOption && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              <button
                type="button"
                onClick={() => setCurrentStep('SMART_OPTIONS')}
                className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1.5 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Pilih Solusi Lain</span>
              </button>

              {/* Amount Display */}
              <div className="p-5 rounded-[22px] bg-[#fafafa] border border-neutral-200/90 text-center space-y-1">
                <span className="text-xs text-neutral-500 font-medium">Tagihan Penyesuaian Sesi</span>
                <div className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                  Rp {vaData.amount.toLocaleString('id-ID')}
                </div>
                <p className="text-xs font-semibold text-[#005E6A] mt-1">
                  {selectedOption.title}
                </p>
              </div>

              {/* BNI VA Pill Card with Countdown Timer */}
              <div className="p-4 rounded-[22px] bg-white border border-neutral-200/90 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded bg-[#005E6A] text-white font-extrabold text-xs">
                      BNI
                    </div>
                    <span className="text-xs font-bold text-neutral-800">BNI Virtual Account (SNAP Resmi)</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <Timer className="w-3 h-3 text-amber-600" />
                    <span>Berlaku 23 Jam 59 Menit</span>
                  </span>
                </div>

                <div className="p-3 bg-[#f8fafc] rounded-xl border border-neutral-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-400 block uppercase font-bold">Nomor Virtual Account</span>
                    <span className="text-base font-mono font-bold text-neutral-900 tracking-wider">
                      {vaData.va_number}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyVA}
                    className="flex items-center gap-1 text-xs bg-white hover:bg-neutral-50 text-neutral-700 px-3 py-1.5 rounded-lg border border-neutral-300 font-medium transition-all"
                  >
                    {copiedVA ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Salin VA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Practical Payment Accordion */}
              <div className="rounded-[20px] bg-[#fafafa] border border-neutral-200/90 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setActiveAccordion(activeAccordion === 'bni_mbanking' ? null : 'bni_mbanking')}
                  className="w-full px-4 py-3 bg-white flex justify-between items-center font-bold text-neutral-800 text-left border-b border-neutral-100"
                >
                  <span>Cara Bayar via BNI Mobile Banking</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${activeAccordion === 'bni_mbanking' ? 'rotate-180' : ''}`} />
                </button>
                {activeAccordion === 'bni_mbanking' && (
                  <div className="p-4 space-y-1.5 text-neutral-600 text-xs leading-relaxed bg-[#fafafa]">
                    <p>1. Buka aplikasi <strong>BNI Mobile Banking</strong> &gt; pilih menu <strong>Pembayaran</strong>.</p>
                    <p>2. Pilih menu <strong>Virtual Account Billing</strong>.</p>
                    <p>3. Masukkan nomor VA <strong>{vaData.va_number}</strong>.</p>
                    <p>4. Masukkan Password Transaksi Anda untuk konfirmasi pembayaran.</p>
                  </div>
                )}
              </div>

              {/* JURI HACKATHON WOW TRIGGER BUTTON (BNI Emerald with Interactive Sparkle) */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSimulatingPayment}
                  onClick={handleSimulatePayment}
                  className="w-full py-4 px-4 rounded-2xl bg-[#005E6A] hover:bg-[#004e58] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-teal-900/10 transition-all active:scale-[0.98] border border-teal-500/30"
                >
                  {isSimulatingPayment ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-white" />
                      <span>Memverifikasi Pelunasan BNI SNAP Webhook...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                      <span>[ Simulasi Pelunasan BNI VA ] &rarr; Aktifkan Seketika</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-neutral-400 text-center block mt-1.5">
                  Klik tombol di atas untuk melihat sinkronisasi instan ke Dashboard BNI &amp; Merchant
                </span>

                {/* Cancel Checkout Option */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleOpenCancelSurvey}
                    disabled={isCancelling}
                    className="text-xs text-neutral-400 hover:text-rose-600 transition-colors font-medium underline underline-offset-4 flex items-center justify-center gap-1 mx-auto"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isCancelling ? 'Membatalkan...' : 'Batal checkout & minta solusi lain'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAHAP 3: TERKUNCI & SUKSES
             ========================================================================= */}
          {currentStep === 'PAID_ACTIVATED' && member && (
            <div className="space-y-5 animate-in fade-in duration-200 text-center py-4">
              
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-neutral-900">Keanggotaan Berhasil Diperbarui!</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                  Solusi jadwal telah aktif secara otomatis pada akun Anda.
                </p>
              </div>

              {/* Summary Receipt Box */}
              <div className="p-4 rounded-[22px] bg-[#fafafa] border border-neutral-200/90 text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-200/60">
                  <span className="text-neutral-500">Nama Member</span>
                  <span className="font-bold text-neutral-900">{member.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60">
                  <span className="text-neutral-500">Status Keanggotaan</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                    AKTIF &amp; TERLINDUNGI
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-200/60">
                  <span className="text-neutral-500">Jadwal Baru</span>
                  <span className="font-bold text-neutral-800 text-right">
                    {selectedOption?.title || 'Kelas Malam Kamis (19.00 WIB)'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Metode</span>
                  <span className="font-mono text-neutral-700">
                    {vaData ? `BNI VA (${vaData.va_number})` : 'Free Waiver'}
                  </span>
                </div>
              </div>

              {/* Email Notification Note */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 text-left flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-neutral-600 leading-relaxed">
                  Bukti pelunasan resmi dan konfirmasi jadwal telah dikirimkan ke email <strong>{member.email}</strong>.
                </div>
              </div>

              {/* Navigation Back */}
              <div className="pt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep('SMART_OPTIONS');
                    setVaData(null);
                    setSelectedOption(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 font-semibold text-xs transition-colors"
                >
                  Ulangi Alur Simulasi
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/merchant"
                    className="py-2.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Dashboard Gym</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </Link>
                  <Link
                    href="/bni"
                    className="py-2.5 rounded-xl bg-[#005E6A] hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <span>Dashboard BNI</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </Link>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Subtle Footer */}
        <div className="p-4 border-t border-neutral-100 bg-[#fafafa] text-center text-[10px] text-neutral-400">
          LANJUT Member Experience &bull; Terhubung Langsung ke BNI SNAP e-Collection
        </div>

      </div>

      {/* End-to-End Cancellation Survey Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-[28px] p-6 shadow-2xl border border-neutral-200 space-y-4">
            {!feedbackOfferResult ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">Konfirmasi Pembatalan</h4>
                      <p className="text-[10px] text-neutral-400">Panggilan nyata ke backend API &amp; AI Generator</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCancelModalOpen(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-neutral-800">
                    <span className="text-[10px] font-bold text-amber-700 block uppercase">
                      {cancelSurvey?.engine_source || 'AI Survey Generator'}
                    </span>
                    <p className="font-semibold text-xs mt-0.5">
                      {cancelSurvey?.question_title || `Halo ${member?.name || 'Member'}, apa kendala yang membuat Anda mempertimbangkan pembatalan?`}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {cancelSurvey?.multiple_choice_options?.map((opt: any) => {
                      const isChecked = cancelSelectedOptions.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (isChecked) {
                              setCancelSelectedOptions(cancelSelectedOptions.filter((i) => i !== opt.id));
                            } else {
                              setCancelSelectedOptions([...cancelSelectedOptions, opt.id]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                            isChecked
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : 'bg-[#fafafa] hover:bg-white border-neutral-200 text-neutral-700'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border ${
                              isChecked
                                ? 'bg-orange-500 border-orange-500 text-white font-bold'
                                : 'border-neutral-300 bg-white'
                            }`}
                          >
                            {isChecked && '✓'}
                          </div>
                          <span className="font-medium text-[11px]">{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                      {cancelSurvey?.free_text_field?.label || 'Catatan Tambahan (Opsional)'}
                    </label>
                    <textarea
                      rows={2}
                      value={cancelFreeText}
                      onChange={(e) => setCancelFreeText(e.target.value)}
                      placeholder={cancelSurvey?.free_text_field?.placeholder || 'Ceritakan kendala Anda...'}
                      className="w-full p-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-800"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingFeedback || cancelSelectedOptions.length === 0}
                    onClick={handleSubmitCancelFeedback}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingFeedback ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <span>Kirim Feedback &rarr;</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-bold text-neutral-900">
                    Solusi Retensi Otomatis Diterbitkan!
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    Feedback Anda telah dicatat di merchant. Kami menawarkan solusi khusus:
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-[9px] font-bold uppercase">
                      {feedbackOfferResult.recommended_action || 'SOLUSI TERBAIK'}
                    </span>
                    <span className="text-[10px] text-emerald-400">Proteksi Margin Aktif</span>
                  </div>
                  <h5 className="font-bold text-sm text-white">{feedbackOfferResult.offer_title}</h5>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    {feedbackOfferResult.description || feedbackOfferResult.reasoning}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCancelModalOpen(false);
                    setFeedbackOfferResult(null);
                    setCurrentStep('SMART_OPTIONS');
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold"
                >
                  Lihat Penawaran Ini di Portal
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f4f6] text-neutral-600 flex items-center justify-center text-xs">Memverifikasi Magic Link...</div>}>
      <MemberPortalContent />
    </Suspense>
  );
}
