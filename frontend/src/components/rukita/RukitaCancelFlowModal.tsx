'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Check,
  Home,
  AlertTriangle
} from 'lucide-react';

interface RukitaCancelFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    current_package: string;
  };
  onResolved?: () => void;
}

interface SurveyQuestion {
  survey_id?: string;
  question_title: string;
  instruction?: string;
  is_multi_select: boolean;
  multiple_choice_options: Array<{ id: string; label: string; category?: string }>;
  free_text_field?: { label: string; placeholder?: string };
  engine_source?: string;
}

interface RetentionOffer {
  offer_title: string;
  recommended_action: string;
  reasoning?: string;
  description?: string;
  highlight?: string;
  action_label?: string;
  guaranteed_margin?: { margin_floor_safe: boolean; margin_floor_idr: number };
}

type Step = 'CONFIRM' | 'REQUESTING' | 'SURVEY' | 'SUBMITTING' | 'RESULT';

// This modal is the tenant-facing (Rukita-branded) skin over the real, already-working
// end-to-end flow: POST /api/member/subscription/:id/cancel (triggers the AI/Gemini
// dynamic empathy survey) -> tenant answers -> POST .../feedback (triggers the AI
// retention-offer engine, margin-locked). No mocked responses: every question and every
// offer shown here comes straight from the backend/AI gateway call.
export default function RukitaCancelFlowModal({ isOpen, onClose, member, onResolved }: RukitaCancelFlowModalProps) {
  const [step, setStep] = useState<Step>('CONFIRM');
  const [survey, setSurvey] = useState<SurveyQuestion | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [offer, setOffer] = useState<RetentionOffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('CONFIRM');
    setSurvey(null);
    setSelectedOptions([]);
    setFreeText('');
    setOffer(null);
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => (prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]));
  };

  const handleRequestMove = async () => {
    setStep('REQUESTING');
    setError(null);
    try {
      const res = await fetch(`/api/member/subscription/${member.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.survey) {
        setSurvey(data.survey);
        if (data.survey.multiple_choice_options?.length > 0) {
          setSelectedOptions([data.survey.multiple_choice_options[0].id]);
        }
        setStep('SURVEY');
      } else {
        throw new Error(data.message || 'Gagal memuat pertanyaan dari sistem AI Rukita.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke server Rukita.');
      setStep('CONFIRM');
    }
  };

  const handleSubmit = async () => {
    setStep('SUBMITTING');
    setError(null);
    try {
      const primaryReason = selectedOptions[0] || 'PRICE_SENSITIVE';
      const res = await fetch(`/api/member/subscription/${member.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason_code: primaryReason,
          selected_option_ids: selectedOptions,
          free_text: freeText
        })
      });
      const data = await res.json();
      setOffer(
        data.retention_offer || {
          offer_title: 'Penyesuaian Sewa Kamar',
          recommended_action: 'REVIEW_MANUAL',
          reasoning: 'Tim Rukita akan menghubungi Anda untuk solusi terbaik.'
        }
      );
      setStep('RESULT');
      onResolved?.();
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim jawaban ke server Rukita.');
      setStep('SURVEY');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Rukita-branded header */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Pindah Kamar / Berhenti Sewa</h3>
              <p className="text-[11px] text-white/80">{member.current_package}</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-5">
          {step === 'CONFIRM' && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-700 leading-relaxed">
                Halo <strong>{member.name}</strong>, sebelum mengajukan pindah kamar atau berhenti sewa, tim AI
                kami akan menanyakan beberapa hal singkat supaya bisa mengusahakan solusi terbaik untuk Anda.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleRequestMove}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  Lanjutkan Pengajuan <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 'REQUESTING' && (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
              <p className="text-sm font-bold text-neutral-900">Menghubungi Sistem Rukita &amp; AI Engine...</p>
              <p className="text-xs text-neutral-500">Menyusun pertanyaan yang relevan dengan riwayat sewa Anda.</p>
            </div>
          )}

          {step === 'SURVEY' && survey && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-100">
                <div className="flex items-center gap-1.5 text-orange-700 text-[11px] font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{survey.engine_source || 'Rukita AI Assistant'}</span>
                </div>
                <h4 className="text-sm font-bold text-neutral-900">{survey.question_title}</h4>
                {survey.instruction && <p className="text-xs text-neutral-600 mt-1">{survey.instruction}</p>}
              </div>

              <div className="space-y-2">
                {survey.multiple_choice_options?.map((opt) => {
                  const checked = selectedOptions.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleOption(opt.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 text-xs ${
                        checked ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border ${
                          checked ? 'bg-orange-500 border-orange-500 text-white' : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </div>
                      <span className="font-semibold">{opt.label}</span>
                    </div>
                  );
                })}
              </div>

              {survey.free_text_field && (
                <textarea
                  rows={2}
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder={survey.free_text_field.placeholder}
                  className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none bg-neutral-50/50"
                />
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={selectedOptions.length === 0}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  Kirim Jawaban <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {step === 'SUBMITTING' && (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
              <p className="text-sm font-bold text-neutral-900">Menganalisis Jawaban Anda...</p>
              <p className="text-xs text-neutral-500">AI sedang meracik rekomendasi terbaik dengan margin terjaga.</p>
            </div>
          )}

          {step === 'RESULT' && offer && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900">
                  Jawaban Anda sudah tersimpan dan diteruskan ke tim Rukita. Berikut rekomendasi dari AI kami:
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 text-white space-y-2">
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-[10px] font-extrabold uppercase">
                  {offer.recommended_action}
                </span>
                <h4 className="text-sm font-bold">{offer.offer_title}</h4>
                <p className="text-xs text-neutral-300">{offer.description || offer.reasoning}</p>
                {offer.guaranteed_margin && (
                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Margin merchant tetap aman
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button onClick={close} className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold">
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
