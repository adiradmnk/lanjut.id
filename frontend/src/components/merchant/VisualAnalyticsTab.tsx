'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import ThinkingState from '@/components/ui/thinking';

interface VisualAnalyticsTabProps {
  analytics: any;
  revenueInsights?: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  lines?: string[];
}

const SAMPLE_PROMPTS = [
  'analisis pendapatan di sebulan terakhir ini',
  'analisis member yang berisiko churn bulan ini',
  'rekomendasi strategi retensi untuk sesi pagi',
  'tren VA settlement 30 hari terakhir',
];

const AI_RESPONSES: Record<string, string[]> = {
  default: [
    '📊 **Analisis Pendapatan — September 2026**',
    '',
    '• Total VA Settled: **Rp 49.229.000** (+12% dari bulan lalu)',
    '• Member aktif: **36.183** dari 49.229 total member',
    '• Retention rate bulan ini: **92.0%** — meningkat 3.2 poin',
    '• Rata-rata nilai transaksi per member: **Rp 1.360.000**',
    '',
    '⚠️ **Risiko yang Terdeteksi**',
    '',
    '• **4 member** dengan VA expired — perlu outreach segera',
    '• Sesi **19:00–21:00 WIB** overbooked, perlu penambahan slot',
    '• Burn rate member baru bulan pertama masih 28% — perlu onboarding lebih kuat',
    '',
    '💡 **Rekomendasi AI**',
    '',
    '1. Tambahkan slot sesi pagi **06:00 WIB** (utilisasi saat ini hanya 18%)',
    '2. Kirim reminder VA otomatis **24 jam sebelum expiry** untuk kurangi silent cancel',
    '3. Terapkan diskon off-peak **10%** untuk sesi Selasa–Kamis pagi',
    '4. Buat program onboarding 30 hari untuk member baru agar burn rate naik ke 60%+',
    '',
    '**Kesimpulan:** Ekosistem sehat secara keseluruhan. Fokus utama: konversi 4 member at-risk dan optimasi slot sepi.',
  ],
  churn: [
    '🔍 **Analisis Member Berisiko Churn — September 2026**',
    '',
    '• Total member teridentifikasi berisiko: **4 orang (HIGH RISK)**',
    '• Kategori risiko: 3× Silent Cancellation, 1× Passive Non-Renewal',
    '',
    '📋 **Detail Member**',
    '',
    '1. **Dina Kusuma** — VA expired, kuota 2/8 tersisa, inaktif 21 hari',
    '2. **Eko Prasetyo** — masa aktif habis 3 hari lagi, belum perpanjang',
    '3. **Farida Hanum** — VA expired 2× berturut-turut, signal price friction',
    '4. **Gunawan Halim** — absen 18 hari, kuota tersisa 6/10',
    '',
    '💡 **Tindakan yang Direkomendasikan**',
    '',
    '• Kirim penawaran **Freeze 30 hari gratis** untuk Dina & Gunawan',
    '• Tawarkan **downgrade paket** ke 4 sesi untuk Farida (price sensitivity)',
    '• Aktifkan reminder otomatis untuk Eko H-3 sebelum masa aktif habis',
    '',
    '**Proyeksi:** Jika ketiga intervensi berhasil, retained revenue +**Rp 1.275.000**',
  ],
  retensi: [
    '🎯 **Strategi Retensi — Sesi Pagi**',
    '',
    '• Utilisasi sesi pagi (06:00–09:00): hanya **18%** kapasitas',
    '• Sesi malam (19:00–21:00): **103%** — overbooked hampir tiap hari',
    '',
    '📦 **Paket Rekomendasi**',
    '',
    '1. **"Early Bird Pass"** — Rp 120.000/sesi (diskon 20% dari harga normal)',
    '   → Target: member yang selama ini pilih malam karena harga sama',
    '',
    '2. **"Shift Reward"** — poin bonus 2× untuk member yang pindah ke sesi pagi',
    '   → Cocok untuk member dengan sisa kuota >4',
    '',
    '3. **"Duo Morning"** — bawa 1 teman, keduanya dapat 1 sesi gratis',
    '   → Viral loop + mengisi kapasitas pagi sekaligus',
    '',
    '**Estimasi dampak:** Kapasitas pagi naik ke 55–65% dalam 30 hari.',
    '**Margin tetap aman:** Di atas floor BNI Rp 50.000/sesi ✓',
  ],
  va: [
    '💳 **Tren VA Settlement — 30 Hari Terakhir**',
    '',
    '• Total VA dibuat: **182 transaksi**',
    '• VA settled (PAID): **171** (93.9%)',
    '• VA expired tanpa bayar: **8** (4.4%)',
    '• VA failed/error: **3** (1.7%)',
    '',
    '📈 **Tren Mingguan**',
    '',
    '• Minggu 1 (1–7 Sep): 44 VA, settlement rate 91.0%',
    '• Minggu 2 (8–14 Sep): 48 VA, settlement rate 94.2%',
    '• Minggu 3 (15–21 Sep): 52 VA, settlement rate 96.1% ← tertinggi',
    '• Minggu 4 (22–30 Sep): 38 VA, settlement rate 92.1%',
    '',
    '⚠️ **Pola yang Dicatat**',
    '',
    '• VA yang dibuat >20:00 WIB memiliki expired rate 3× lebih tinggi',
    '• Reminder notifikasi jam 09:00 keesokan hari terbukti efektif +14%',
    '',
    '**Rekomendasi:** Batasi pembuatan VA tanpa reminder jika user aktif <30 hari.',
  ],
};

function getAiResponse(query: string): string[] {
  const q = query.toLowerCase();
  if (q.includes('churn') || q.includes('risiko') || q.includes('berhenti')) return AI_RESPONSES.churn;
  if (q.includes('retensi') || q.includes('strategi') || q.includes('pagi')) return AI_RESPONSES.retensi;
  if (q.includes('va') || q.includes('settlement') || q.includes('virtual account')) return AI_RESPONSES.va;
  return AI_RESPONSES.default;
}

export default function VisualAnalyticsTab({ analytics, revenueInsights }: VisualAnalyticsTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'streaming'>('idle');
  const [thinkingKey, setThinkingKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, phase]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setPhase('idle');
  };

  const handleSend = (text?: string) => {
    const query = text ?? input;
    if (!query.trim() || phase !== 'idle') return;

    const userMsg: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPhase('thinking');
    setThinkingKey(k => k + 1);

    const responseLines = getAiResponse(query);

    // After thinking duration, start streaming lines
    setTimeout(() => {
      setPhase('streaming');
      const assistantMsg: Message = { role: 'assistant', content: '', lines: [] };
      setMessages(prev => [...prev, assistantMsg]);

      responseLines.forEach((line, i) => {
        setTimeout(() => {
          setMessages(prev => {
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            last.lines = [...(last.lines ?? []), line];
            updated[updated.length - 1] = last;
            return updated;
          });
          if (i === responseLines.length - 1) {
            setTimeout(() => setPhase('idle'), 200);
          }
        }, i * 160);
      });
    }, 4200);
  };

  const renderLine = (line: string, i: number) => {
    if (line === '') return <div key={i} className="h-2" />;
    const isBold = line.startsWith('📊') || line.startsWith('⚠️') || line.startsWith('💡') ||
      line.startsWith('📋') || line.startsWith('📈') || line.startsWith('💳') ||
      line.startsWith('📦') || line.startsWith('🔍') || line.startsWith('🎯');
    const isSub = line.startsWith('•') || /^\d\./.test(line) || line.startsWith('   →');
    const isConclusion = line.startsWith('**');

    const renderBold = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, pi) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={pi} className="text-white font-semibold">{part.slice(2, -2)}</strong>
          : part
      );
    };

    return (
      <div
        key={i}
        className={`leading-relaxed ${
          isBold ? 'text-white font-bold text-[13.5px] mt-1' :
          isSub ? 'text-neutral-300 text-[13px] ml-2' :
          isConclusion ? 'text-[#24B1B1] text-[13px] font-medium' :
          'text-neutral-400 text-[13px]'
        }`}
        style={{ animation: 'thinking-fade-up 180ms ease-out both' }}
      >
        {renderBold(line)}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#171717] rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-200">
      {/* Top Header ala Claude Code / Terminal Window */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#1a1a1a]/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]/80 border border-[#e0443e]/50" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/80 border border-[#dea123]/50" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]/80 border border-[#1aab29]/50" />
          <div className="h-4 w-px bg-white/10 mx-1.5" />
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#24B1B1]" />
            <span className="text-xs font-mono font-medium text-neutral-300 tracking-wide">
              lanjut-ai-analyst · v2.4 (Claude Engine)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-mono transition-colors cursor-pointer border border-white/5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Bersihkan Chat</span>
            </button>
          )}
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            ● Ready
          </span>
        </div>
      </div>

      {/* Main Canvas / Chat Logs */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 flex flex-col font-mono">
        {/* Empty State: Centered Claude-style Prompt suggestions */}
        {messages.length === 0 && phase === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-xl mx-auto my-auto text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#007979]/40 to-[#24B1B1]/20 border border-[#24B1B1]/40 flex items-center justify-center shadow-lg shadow-[#007979]/20">
                <Sparkles className="w-7 h-7 text-[#24B1B1]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">AI Financial & Retention Analyst</h2>
                <p className="text-xs text-neutral-400 mt-1 max-w-md leading-relaxed">
                  Asisten analitik data cerdas. Ajukan pertanyaan seputar pendapatan VA BNI, tren churn, hingga rekomendasi okupansi kelas.
                </p>
              </div>
            </div>

            {/* Quick Sample Prompts */}
            <div className="w-full space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Contoh Pertanyaan Cepat:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="flex items-center justify-between p-3 text-left rounded-xl bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer group"
                  >
                    <span className="truncate mr-2 font-mono">"{prompt}"</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#24B1B1] shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.length > 0 && (
          <div className="space-y-6 max-w-3xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-[#007979]/20 border border-[#007979]/40 rounded-2xl rounded-tr-sm px-4 py-3 text-[13px] text-neutral-100 max-w-lg shadow-sm">
                      <span className="text-neutral-400 text-xs mr-2 font-mono">&gt;</span>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3.5 items-start">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007979] to-[#005f5f] flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 bg-[#1e1e1e] border border-white/8 rounded-2xl rounded-tl-sm p-5 space-y-1 shadow-lg">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                        <span className="text-[11px] font-mono text-[#24B1B1] font-semibold uppercase tracking-wider">
                          AI Analyst Report
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">Real-time Stream</span>
                      </div>
                      <div className="space-y-0.5">
                        {(msg.lines ?? []).map((line, li) => renderLine(line, li))}
                        {idx === messages.length - 1 && phase === 'streaming' && (
                          <span className="inline-block w-1.5 h-4 bg-[#24B1B1] ml-1 align-middle animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Thinking State */}
            {phase === 'thinking' && (
              <div className="flex gap-3.5 items-start" style={{ animation: 'thinking-fade-up 300ms ease-out both' }}>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007979] to-[#005f5f] flex items-center justify-center shrink-0 shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-[#1e1e1e] border border-white/8 rounded-2xl rounded-tl-sm p-4 max-w-md shadow-lg">
                  <ThinkingState key={thinkingKey} variant="Reasoning" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Bottom Input Area ala Claude Code */}
      <div className="shrink-0 p-5 sm:px-12 border-t border-white/8 bg-[#171717]/95 backdrop-blur">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 bg-[#212121] border border-white/12 focus-within:border-[#24B1B1] rounded-2xl px-4 py-3.5 transition-all shadow-xl">
            <span className="text-neutral-500 font-mono text-sm pl-1">&gt;</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ketik perintah atau pertanyaan analisis (misal: analisis pendapatan di sebulan terakhir ini)..."
              disabled={phase !== 'idle'}
              className="flex-1 bg-transparent text-[13.5px] text-neutral-100 placeholder:text-neutral-600 outline-none font-mono disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || phase !== 'idle'}
              className="px-3.5 py-2 rounded-xl flex items-center gap-1.5 bg-[#007979] hover:bg-[#005f5f] disabled:bg-white/5 disabled:text-neutral-600 text-white text-xs font-mono font-medium transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-2.5 px-2">
            <span>Tekan <kbd className="bg-white/10 px-1 py-0.5 rounded text-neutral-400">Enter</kbd> untuk menganalisis</span>
            <span className="text-neutral-600">Model: Gemini 2.0 Flash × BNI Direct Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
