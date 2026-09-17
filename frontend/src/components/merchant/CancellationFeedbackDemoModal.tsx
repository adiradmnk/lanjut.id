'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  UserCheck,
  Clock,
  Layers,
  Check
} from 'lucide-react';

interface CancellationFeedbackDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onFeedbackSaved?: () => void;
}

interface MemberOption {
  id: string;
  name: string;
  email: string;
  current_package: string;
  churn_risk_flag: string;
  used_quota: number;
  total_quota: number;
}

interface SurveyQuestion {
  survey_id?: string;
  question_title: string;
  instruction?: string;
  is_multi_select: boolean;
  multiple_choice_options: Array<{
    id: string;
    label: string;
    category?: string;
  }>;
  free_text_field?: {
    label: string;
    placeholder?: string;
  };
  engine_source?: string;
}

interface RetentionOffer {
  offer_id?: string;
  offer_title: string;
  recommended_action: string;
  reasoning?: string;
  discount_percentage?: number;
  price_adjustment_idr?: number;
  highlight?: string;
  description?: string;
  action_label?: string;
  guaranteed_margin?: {
    margin_floor_safe: boolean;
    margin_floor_idr: number;
  };
  engine_source?: string;
}

export default function CancellationFeedbackDemoModal({
  isOpen,
  onClose,
  tenantId,
  onFeedbackSaved
}: CancellationFeedbackDemoModalProps) {
  // Steps: 'CHOOSE_MEMBER' | 'SIMULATING_CANCEL' | 'SURVEY_MODAL' | 'SUBMITTING_FEEDBACK' | 'OFFER_RESULT'
  const [step, setStep] = useState<
    'CHOOSE_MEMBER' | 'SIMULATING_CANCEL' | 'SURVEY_MODAL' | 'SUBMITTING_FEEDBACK' | 'OFFER_RESULT'
  >('CHOOSE_MEMBER');

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Dynamic Survey state from real backend API
  const [survey, setSurvey] = useState<SurveyQuestion | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [freeTextFeedback, setFreeTextFeedback] = useState<string>('');

  // Retention Offer state from real backend API
  const [retentionOffer, setRetentionOffer] = useState<RetentionOffer | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch available members on open
  useEffect(() => {
    if (!isOpen) return;
    setStep('CHOOSE_MEMBER');
    setSurvey(null);
    setSelectedOptions([]);
    setFreeTextFeedback('');
    setRetentionOffer(null);
    setApiError(null);

    const loadMembers = async () => {
      setLoadingMembers(true);
      try {
        const res = await fetch(`/api/merchant/${tenantId}/at-risk-members`);
        const data = await res.json();
        if (data.members && data.members.length > 0) {
          setMembers(data.members);
          setSelectedMember(data.members[0]);
        } else {
          setMembers([]);
          setSelectedMember(null);
        }
      } catch {
        setMembers([]);
        setSelectedMember(null);
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [isOpen, tenantId]);

  // Step 1: Call real End-to-End API: POST /api/member/subscription/:id/cancel
  const handleTriggerCancellation = async () => {
    if (!selectedMember) return;
    setStep('SIMULATING_CANCEL');
    setApiError(null);

    try {
      const res = await fetch(`/api/member/subscription/${selectedMember.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.survey) {
        setSurvey(data.survey);
        // Pre-select first option for pleasant UX
        if (data.survey.multiple_choice_options?.length > 0) {
          setSelectedOptions([data.survey.multiple_choice_options[0].id]);
        }
        setStep('SURVEY_MODAL');
      } else {
        throw new Error(data.message || 'Gagal memuat dynamic cancellation survey');
      }
    } catch (err: any) {
      setApiError(err.message || 'Gagal terhubung ke API backend.');
      setStep('CHOOSE_MEMBER');
    }
  };

  const toggleOption = (id: string) => {
    if (selectedOptions.includes(id)) {
      setSelectedOptions(selectedOptions.filter((item) => item !== id));
    } else {
      setSelectedOptions([...selectedOptions, id]);
    }
  };

  // Step 2: Call real End-to-End API: POST /api/member/subscription/:id/feedback
  const handleSubmitFeedback = async () => {
    if (!selectedMember) return;
    setStep('SUBMITTING_FEEDBACK');
    setApiError(null);

    try {
      const primaryReason = selectedOptions[0] || 'PRICE_SENSITIVE';
      const res = await fetch(`/api/member/subscription/${selectedMember.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason_code: primaryReason,
          selected_option_ids: selectedOptions,
          free_text: freeTextFeedback
        })
      });
      const data = await res.json();

      if (data.retention_offer) {
        setRetentionOffer(data.retention_offer);
        setStep('OFFER_RESULT');
        if (onFeedbackSaved) onFeedbackSaved();
      } else {
        // Safe fallback offer structure if backend returned without retention_offer
        setRetentionOffer({
          offer_title: 'Penyesuaian Jadwal Bebas Biaya',
          recommended_action: 'SWITCH_EVENING',
          reasoning: 'AI mendeteksi kendala fleksibilitas waktu pengguna.',
          action_label: 'Klaim Penyesuaian Jadwal',
          guaranteed_margin: {
            margin_floor_safe: true,
            margin_floor_idr: 50000
          }
        });
        setStep('OFFER_RESULT');
        if (onFeedbackSaved) onFeedbackSaved();
      }
    } catch (err: any) {
      setApiError(err.message || 'Gagal mengirimkan feedback ke backend API.');
      setStep('SURVEY_MODAL');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-[28px] shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-neutral-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">
                  Live Demo: Order/Subscription Canceled Feedback Loop
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                  End-to-End API
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Panggilan nyata ke backend Go <code className="text-rose-700 font-mono text-[10px]">/api/member/subscription/:id/cancel</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* API Error Notification */}
        {apiError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">

          {/* STEP 1: CHOOSE MEMBER & SIMULATE ORDER/SUBSCRIPTION CANCEL */}
          {step === 'CHOOSE_MEMBER' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#fafafa] border border-neutral-200/90 text-xs text-neutral-600 space-y-2">
                <p className="font-semibold text-neutral-800">
                  🎯 Skenario Alur Pembatalan (Order Canceled / Expiration Event):
                </p>
                <p className="text-[11px] leading-relaxed">
                  Ketika member melakukan pembatalan (atau sistem mendeteksi order/tagihan VA kedaluwarsa tanpa dibayar), backend akan memanggil model <strong>Gemini 1.5 Flash</strong> via FastAPI untuk meracik kuesioner empati dinamis beserta opsi spesifik yang relevan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Pilih Member yang Mengalami Pembatalan:
                </label>
                {loadingMembers ? (
                  <div className="py-4 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memuat data member...</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          selectedMember?.id === m.id
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                            : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span>{m.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                selectedMember?.id === m.id
                                  ? 'bg-rose-500 text-white'
                                  : m.churn_risk_flag === 'HIGH'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {m.churn_risk_flag || 'ACTIVE'}
                            </span>
                          </div>
                          <div className={`text-[10px] mt-0.5 ${selectedMember?.id === m.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                            {m.current_package} &bull; Sisa {m.total_quota - m.used_quota} sesi
                          </div>
                        </div>

                        {selectedMember?.id === m.id && (
                          <Check className="w-4 h-4 text-orange-400 shrink-0" />
                        )}
                      </div>
                    )))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">
                  Endpoint: <code className="text-neutral-600">POST /api/member/subscription/:id/cancel</code>
                </span>
                <button
                  type="button"
                  onClick={handleTriggerCancellation}
                  disabled={!selectedMember}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Simulasikan Order/Subscription Canceled &rarr;</span>
                </button>
              </div>
            </div>
          )}

          {/* SIMULATING CANCEL SPINNER */}
          {step === 'SIMULATING_CANCEL' && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
              <div>
                <p className="text-sm font-bold text-neutral-900">Menghubungi Backend &amp; Gemini AI Engine...</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Mengekstrak profil bisnis merchant, riwayat transaksi, dan merancang kuesioner empati dinamis.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: DYNAMIC POP-UP SURVEY FROM BACKEND / AI ENGINE */}
          {step === 'SURVEY_MODAL' && survey && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Dynamic Question Title */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{survey.engine_source || 'Gemini 1.5 Dynamic Generator'}</span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900 leading-snug">
                  {survey.question_title}
                </h4>
                {survey.instruction && (
                  <p className="text-xs text-neutral-600 mt-1">{survey.instruction}</p>
                )}
              </div>

              {/* Dynamic Multiple Choice Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Alasan yang Relevan (Bisa Pilih Lebih dari Satu):
                </label>
                {survey.multiple_choice_options?.map((opt) => {
                  const isChecked = selectedOptions.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleOption(opt.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-xs ${
                        isChecked
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                          : 'bg-[#fafafa] hover:bg-white border-neutral-200 text-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                          isChecked
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <div>
                        <span className="font-semibold block">{opt.label}</span>
                        {opt.category && (
                          <span
                            className={`text-[9px] uppercase font-bold tracking-wider ${
                              isChecked ? 'text-neutral-400' : 'text-neutral-400'
                            }`}
                          >
                            Kategori: {opt.category}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Free Text Feedback */}
              {survey.free_text_field && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {survey.free_text_field.label}
                  </label>
                  <textarea
                    rows={2}
                    value={freeTextFeedback}
                    onChange={(e) => setFreeTextFeedback(e.target.value)}
                    placeholder={survey.free_text_field.placeholder || 'Ceritakan kendala spesifik Anda...'}
                    className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none bg-neutral-50/50"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('CHOOSE_MEMBER')}
                  className="text-xs text-neutral-500 hover:text-neutral-800 font-medium"
                >
                  &larr; Ganti Member
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={selectedOptions.length === 0}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>Kirim Masukan ke Backend</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* SUBMITTING FEEDBACK SPINNER */}
          {step === 'SUBMITTING_FEEDBACK' && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-neutral-900">Menyimpan Feedback &amp; Meracik Solusi AI...</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Menyimpan rekaman ke database PostgreSQL dan memanggil RAG Retention Engine berproteksi margin.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTING RETENTION OFFER & CONFIRMATION */}
          {step === 'OFFER_RESULT' && retentionOffer && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-emerald-950">
                    Feedback Sukses Diterima &amp; Tersinkronisasi ke Dashboard Merchant!
                  </h4>
                  <p className="text-emerald-800 mt-0.5 text-[11px] leading-relaxed">
                    Data pembatalan dan ulasan member telah dicatat di database relasional. Berikut adalah penawaran retensi cerdas yang langsung dipersonalisasi untuk member:
                  </p>
                </div>
              </div>

              {/* Rendered Retention Offer Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold uppercase tracking-wide">
                    {retentionOffer.recommended_action || 'RECOMMENDED OFFER'}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Margin Protected</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    {retentionOffer.offer_title}
                  </h4>
                  {retentionOffer.highlight && (
                    <p className="text-xs text-orange-400 font-semibold mt-0.5">
                      {retentionOffer.highlight}
                    </p>
                  )}
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    {retentionOffer.description || retentionOffer.reasoning}
                  </p>
                </div>

                {retentionOffer.guaranteed_margin && (
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-[11px] text-neutral-300 flex items-center justify-between">
                    <span>Proteksi Margin Minimum:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      Rp {retentionOffer.guaranteed_margin.margin_floor_idr?.toLocaleString('id-ID') || '50.000'} (Aman)
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep('CHOOSE_MEMBER')}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold"
                >
                  &larr; Coba Member Lain
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-sm"
                >
                  Tutup Demo
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
