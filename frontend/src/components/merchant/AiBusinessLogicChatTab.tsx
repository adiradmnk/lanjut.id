'use client';

import React, { useState, useRef, useEffect } from 'react';
import ThinkingState from '@/components/ui/thinking';
import { 
  ArrowUp, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  X, 
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface AiBusinessLogicChatTabProps {
  tenantName: string;
  tenantCategory: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AiBusinessLogicChatTab({
  tenantName,
  tenantCategory
}: AiBusinessLogicChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const defaultUserPrompt = "tolong ubah batas diskon menjadi 10 persen untuk 5 hari kedepan";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (hasStarted) {
      scrollToBottom();
    }
  }, [messages, isThinking]);

  const handleSubmit = (textToSubmit?: string) => {
    const query = (textToSubmit || inputVal).trim();
    if (!query || isThinking) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setHasStarted(true);
    setIsThinking(true);

    setTimeout(() => {
      setIsThinking(false);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Saya telah menganalisis permintaan perubahan logika bisnis untuk ${tenantName}:

1. Dampak Finansial & Proyeksi:
- Batas Diskon Maksimal: Disesuaikan dari 25% menjadi 10%
- Durasi Kebijakan: Berlaku otomatis selama 5 hari (hingga 23 September 2026)
- Estimasi Proteksi Margin: Menjaga stabilitas margin laba kotor hingga +14.8% dan menghindari kanibalisasi paket reguler
- Dampak Retensi: Diskon 10% tetap berada di atas ambang batas psikologis konversi member (7.5%)

2. Status Kebijakan Bisnis:
Aturan validasi engine siap dimutakhirkan pada parameter 'MAX_DISCOUNT_THRESHOLD_PERCENT' dan 'POLICY_EXPIRATION_DAYS'.`
      };
      setMessages(prev => [...prev, assistantMsg]);
    }, 4200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setHasStarted(false);
    setIsThinking(false);
    setInputVal('');
    setShowPlanModal(false);
    setIsApplied(false);
  };

  const handleApplyPlan = () => {
    setIsApplied(true);
    setShowPlanModal(false);
  };

  return (
    <div className="relative flex flex-col h-full w-full max-w-3xl mx-auto">
      {hasStarted && (
        <div className="flex items-center justify-end pb-2 shrink-0">
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sesi</span>
          </button>
        </div>
      )}

      {/* Main viewport */}
      {!hasStarted ? (
        /* 1. INITIAL EMPTY STATE: ONLY THE CENTERED INPUT BOX */
        <div className="flex-1 flex flex-col items-center justify-center -mt-8 px-4 transition-all duration-300">
          <div className="w-full max-w-2xl bg-[#1f1f1f] border border-white/15 rounded-2xl shadow-2xl p-3 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder=""
              className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none resize-none px-2 py-1 leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-end pt-2 px-1">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!inputVal.trim()}
                className={`p-2 rounded-xl transition-all duration-150 flex items-center justify-center ${
                  inputVal.trim()
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 hover:bg-orange-600'
                    : 'bg-white/5 text-neutral-500 cursor-not-allowed'
                }`}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2. CHAT STREAM VIEW (MESSAGES SCROLLABLE, FORM DOCKED AT BOTTOM) */
        <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
          {/* Scrollable messages container */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 py-4">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                {/* User Message */}
                {msg.role === 'user' && (
                  <div className="text-right">
                    <p className="text-sm text-neutral-200 font-medium inline-block whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                )}

                {/* Assistant Message */}
                {msg.role === 'assistant' && (
                  <div className="space-y-4 text-left">
                    <ThinkingState
                      variant="Reasoning"
                      customActive="Mengevaluasi batas diskon dinamis & simulasi margin 5 hari ke depan..."
                      customDone="Selesai menganalisis rencana logika bisnis (3.8 detik)"
                      customRows={[
                        { primary: "Membaca konfigurasi aturan aktif", secondary: "max_discount: 25% (status: active)" },
                        { primary: "Simulasi elastisitas kuota & proteksi margin", secondary: "10% diskon menahan margin +14.8%" },
                        { primary: "Menghitung durasi time-to-live parameter", secondary: "5 hari kalender (berakhir 23 Sept)" },
                        { primary: "Mempersiapkan rencana patch logika bisnis", secondary: "Selesai" }
                      ]}
                    />

                    {/* Plain Text Output */}
                    <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Kotak Kecil Rencana Logika Bisnis */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPlanModal(true)}
                        className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all shadow-md text-left cursor-pointer border ${
                          isApplied
                            ? 'bg-[#1a2e22] border-emerald-500/40'
                            : 'bg-[#212121] hover:bg-[#282828] border-white/10 hover:border-orange-500/40'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                          isApplied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                        }`}>
                          {isApplied ? <CheckCircle2 className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white group-hover:text-orange-300 transition-colors">
                              {isApplied ? "Logika Bisnis Telah Diperbarui" : "Rencana Perubahan Logika Bisnis"}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isApplied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-neutral-400'
                            }`}>
                              {isApplied ? 'Applied' : 'Pending Approval'}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 group-hover:text-neutral-300">
                            {isApplied 
                              ? "Batas diskon 10% aktif selama 5 hari ke depan." 
                              : "Sudah saya buatkan rencana untuk mengubah logika bisnis. Jika Anda menyetujui, akan saya ubah."}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Active Thinking State */}
            {isThinking && (
              <div className="space-y-2 text-left animate-in fade-in duration-300">
                <ThinkingState
                  variant="Steps"
                  customActive="Mengevaluasi parameter logika bisnis dan menghitung dampak perubahan..."
                  customRows={[
                    { primary: "Menginspeksi modul diskon retensi" },
                    { primary: "Menguji ambang batas margin terhadap proyeksi omzet" },
                    { primary: "Menyusun skema validasi perubahan 5 hari" }
                  ]}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* DOCKED BOTTOM INPUT FORM */}
          <div className="pt-2 pb-1 shrink-0 bg-[#171717]">
            <div className="w-full bg-[#1f1f1f] border border-white/15 rounded-2xl shadow-xl p-2.5 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 transition-all duration-200">
              <textarea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isThinking}
                placeholder=""
                className="w-full bg-transparent text-sm text-white focus:outline-none resize-none px-2 py-1 leading-relaxed disabled:opacity-50"
              />
              <div className="flex items-center justify-end pt-2 px-1">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!inputVal.trim() || isThinking}
                  className={`p-1.5 rounded-xl transition-all duration-150 flex items-center justify-center ${
                    inputVal.trim() && !isThinking
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 hover:bg-orange-600'
                      : 'bg-white/5 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL KONFIRMASI RENCANA LOGIKA BISNIS */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setShowPlanModal(false)} />
          <div className="relative w-full max-w-xl bg-[#1e1e1e] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#252525]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Rencana Pembaruan Logika Bisnis</h3>
                  <p className="text-xs text-neutral-400">Parameter Diskon Merchant: {tenantName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-neutral-400">Parameter</span>
                  <span className="text-neutral-400">Nilai Sebelum &rarr; Sesudah</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">MAX_DISCOUNT_PERCENT</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-red-400/80">25%</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500" />
                    <span className="text-emerald-400 font-bold">10%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">POLICY_ACTIVE_DURATION</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-neutral-500">Standar (30 hr)</span>
                    <ArrowRight className="w-3 h-3 text-neutral-500" />
                    <span className="text-emerald-400 font-bold">5 Hari Kalender</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">AUTO_REVERT_ENABLED</span>
                  <span className="text-emerald-400 font-bold">TRUE (Setelah 5 hari)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200/90 text-xs leading-relaxed flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p>
                  Perubahan ini akan langsung berdampak pada engine penawaran otomatis member at-risk dan checkout Virtual Account BNI Direct.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-[#222222] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyPlan}
                disabled={isApplied}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
                  isApplied
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isApplied ? 'Perubahan Sudah Diterapkan' : 'Setujui & Terapkan Logika'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
