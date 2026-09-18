'use client';

import React, { useState, useEffect, useRef } from 'react';
import ThinkingState from '@/components/ui/thinking';
import {
  Upload, CheckCircle2, AlertTriangle, Sparkles, Send,
  Check, TrendingUp, ShieldCheck, CreditCard,
  Building2, Activity, FileText,
  Plus, Cpu
} from 'lucide-react';

// Scene controller - auto-advances through scenes for screen recording
const SCENE_DURATIONS = [9000, 15000, 15000, 15000, 99999]; // ms per scene

export default function DemoVideoPage() {
  const [scene, setScene] = useState(0);

  useEffect(() => {
    if (scene >= 4) return;
    const t = setTimeout(() => setScene(s => s + 1), SCENE_DURATIONS[scene]);
    return () => clearTimeout(t);
  }, [scene]);

  return (
    <div className="h-screen w-full bg-[#171717] text-[#fafafa] font-sans overflow-hidden select-none">
      {/* Scene indicator */}
      <div className="fixed top-3 right-4 z-50 flex gap-1.5">
        {[0,1,2,3,4].map(i => (
          <button
            key={i}
            onClick={() => setScene(i)}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              scene === i ? 'bg-[#24B1B1] scale-125' : 'bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>

      {scene === 0 && <SceneOnboarding />}
      {scene === 1 && <SceneChatbot />}
      {scene === 2 && <SceneTransactions />}
      {scene === 3 && <SceneFeedbackAndAnalytics />}
      {scene === 4 && <ScenePortfolioHealth />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 0: BNI Payment Gateway Provider Onboarding
// ─────────────────────────────────────────────────────────────────────────────
function SceneOnboarding() {
  const [dragPhase, setDragPhase] = useState<'idle' | 'dragging' | 'done'>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setDragPhase('dragging'), 2000);
    const t2 = setTimeout(() => setDragPhase('done'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const checklist = [
    { label: 'Izin Usaha (SIUP/NIB)', done: true },
    { label: 'NPWP Perusahaan', done: true },
    { label: 'Rekening BNI Aktif', done: true },
    { label: 'Katalog Produk & Harga', done: dragPhase === 'done', required: true },
  ];

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 border-b border-white/8 flex items-center px-6 gap-3 bg-[#171717] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#007979] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">BNI</span>
          </div>
          <span className="text-sm font-semibold text-white">BNI Direct Partner Portal</span>
        </div>
        <span className="text-white/30 text-xs ml-auto">Onboarding Aplikasi Merchant</span>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[320px] border-r border-white/8 p-6 flex flex-col gap-4 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">Syarat Persetujuan</h2>
            <p className="text-[11px] text-neutral-400 mt-1">Lengkapi semua dokumen untuk mendapatkan approval BNI</p>
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 ${
                  item.done
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : item.required
                    ? 'bg-orange-500/10 border-orange-500/40'
                    : 'bg-white/3 border-white/8'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  item.done ? 'bg-emerald-500' : item.required ? 'bg-orange-500/30 border border-orange-500' : 'bg-white/10'
                }`}>
                  {item.done ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                  )}
                </div>
                <span className={`text-[13px] font-medium ${
                  item.done ? 'text-emerald-400' : item.required ? 'text-orange-400' : 'text-neutral-400'
                }`}>
                  {item.label}
                </span>
                {item.required && !item.done && (
                  <span className="ml-auto text-[9px] font-bold uppercase tracking-wide bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                    Wajib
                  </span>
                )}
              </div>
            ))}
          </div>

          {dragPhase === 'done' && (
            <div className="mt-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30" style={{ animation: 'thinking-fade-up 400ms ease-out both' }}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-400">AI Extraction Berhasil</span>
              </div>
              <p className="text-[11px] text-emerald-300/80">Sistem membaca <strong>12 aturan harga</strong> &amp; <strong>8 paket produk</strong></p>
            </div>
          )}
        </div>

        <div className="flex-1 p-8 flex flex-col items-center justify-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white text-center">Unggah Katalog Produk</h1>
            <p className="text-sm text-neutral-400 text-center mt-2">Dokumen panduan bisnis, pricelist, atau SOP layanan Anda</p>
          </div>

          <div
            className={`w-full max-w-lg h-52 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all duration-500 ${
              dragPhase === 'done'
                ? 'border-emerald-500 bg-emerald-500/10'
                : dragPhase === 'dragging'
                ? 'border-[#24B1B1] bg-[#24B1B1]/10 scale-[1.02]'
                : 'border-white/20 bg-white/3 hover:border-white/30'
            }`}
          >
            {dragPhase === 'done' ? (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="text-center" style={{ animation: 'thinking-fade-up 400ms ease-out both' }}>
                  <p className="text-base font-semibold text-emerald-400">Katalog berhasil diunggah!</p>
                  <p className="text-xs text-emerald-300/70 mt-1">panduan_bisnis_fitbody.pdf · 2.4 MB</p>
                </div>
              </>
            ) : dragPhase === 'dragging' ? (
              <>
                <div className="w-14 h-14 rounded-full bg-[#24B1B1]/20 flex items-center justify-center">
                  <FileText className="w-7 h-7 text-[#24B1B1]" style={{ animation: 'thinking-fade-up 200ms ease-out both' }} />
                </div>
                <p className="text-sm font-medium text-[#24B1B1]">Lepaskan untuk mengunggah...</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-neutral-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-300">Drag &amp; drop dokumen panduan bisnis Anda</p>
                  <p className="text-xs text-neutral-500 mt-1">PDF, DOCX, atau XLSX · Maks. 10 MB</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-[#007979] text-white text-sm font-medium hover:bg-[#005f5f] transition-colors cursor-pointer">
                  Pilih File
                </button>
              </>
            )}
          </div>

          {dragPhase === 'done' && (
            <div className="flex items-center gap-3" style={{ animation: 'thinking-fade-up 600ms ease-out both' }}>
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-neutral-400">Semua syarat terpenuhi</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1: Merchant Dashboard → Business Logic Chatbot
// ─────────────────────────────────────────────────────────────────────────────
const TARGET_MSG = 'Tolong update bahwasanya diskon yang paling tinggi untuk sesi sekarang adalah 4 persen';

function SceneChatbot() {
  const [chatPhase, setChatPhase] = useState<'login' | 'typing' | 'thinking' | 'plan' | 'approved'>('login');
  const [typedText, setTypedText] = useState('');
  const [thinkingKey, setThinkingKey] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setChatPhase('typing'), 1200);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (chatPhase !== 'typing') return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(TARGET_MSG.slice(0, i));
      if (i >= TARGET_MSG.length) {
        clearInterval(interval);
        setTimeout(() => { setChatPhase('thinking'); setThinkingKey(k => k + 1); }, 400);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [chatPhase]);

  useEffect(() => {
    if (chatPhase !== 'thinking') return;
    const t = setTimeout(() => setChatPhase('plan'), 5000);
    return () => clearTimeout(t);
  }, [chatPhase]);

  useEffect(() => {
    if (chatPhase !== 'plan') return;
    const t = setTimeout(() => setChatPhase('approved'), 3000);
    return () => clearTimeout(t);
  }, [chatPhase]);

  if (chatPhase === 'login') {
    return (
      <div className="h-full flex items-center justify-center bg-[#171717]">
        <div className="text-center" style={{ animation: 'thinking-fade-up 400ms ease-out both' }}>
          <div className="text-2xl font-bold text-white mb-2">Lanjut.id</div>
          <div className="text-sm text-neutral-400">Masuk sebagai merchant@lanjut.id...</div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#24B1B1]" style={{ animation: 'thinking-spin 1s linear infinite' }} />
            <span className="text-xs text-neutral-500">Memverifikasi OTP...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-[220px] bg-[#171717] border-r border-white/8 flex flex-col p-3 shrink-0">
        <div className="mb-4 px-2">
          <div className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider mb-2">FitBody Gym</div>
          <div className="text-[10px] text-neutral-600">Merchant Pro</div>
        </div>
        {(['Dashboard', 'Retention Inbox', 'Analytics', 'Business Logic', 'BNI Revenue'] as const).map((label) => {
          const active = label === 'Business Logic';
          return (
            <div
              key={label}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] mb-0.5 ${
                active ? 'bg-white/8 text-white font-medium' : 'text-neutral-400'
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${active ? 'text-[#24B1B1]' : 'text-neutral-500'}`} />
              {label}
            </div>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 border-b border-white/8 px-6 flex items-center shrink-0">
          <span className="text-sm font-semibold text-white">Business Logic · AI Guardian</span>
          <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">● Live</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#007979] flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1">
              <div className="bg-[#212121] border border-white/8 rounded-2xl rounded-tl-none px-4 py-3 text-[13px] text-neutral-200 leading-relaxed max-w-xl">
                Halo FitBody Gym! Saya AI Business Logic Guardian dari LANJUT x BNI. Saya siap membantu menyesuaikan aturan retensi, diskon, atau katalog paket dengan tetap mematuhi margin floor perbankan BNI. Apa yang ingin Anda sesuaikan?
              </div>
            </div>
          </div>

          {(chatPhase === 'typing' || chatPhase === 'thinking' || chatPhase === 'plan' || chatPhase === 'approved') && (
            <div className="flex gap-3 justify-end">
              <div className="bg-[#007979] rounded-2xl rounded-tr-none px-4 py-3 text-[13px] text-white max-w-xl">
                {typedText}
                {chatPhase === 'typing' && <span className="inline-block w-0.5 h-3.5 bg-white ml-0.5 animate-pulse" />}
              </div>
            </div>
          )}

          {(chatPhase === 'thinking' || chatPhase === 'plan' || chatPhase === 'approved') && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#007979] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-[#212121] border border-white/8 rounded-2xl rounded-tl-none px-4 py-3 max-w-xl">
                  <ThinkingState key={thinkingKey} variant="Steps" />
                </div>
              </div>
            </div>
          )}

          {(chatPhase === 'plan' || chatPhase === 'approved') && (
            <div className="flex gap-3" style={{ animation: 'thinking-fade-up 400ms ease-out both' }}>
              <div className="w-7 h-7 rounded-full bg-[#007979] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 max-w-xl">
                <div className="bg-[#212121] border border-white/8 rounded-2xl rounded-tl-none px-4 py-4 space-y-3">
                  <p className="text-[13px] text-neutral-200">Baik! Saya telah menganalisis permintaan Anda dan memvalidasi terhadap margin floor BNI. Berikut rencana implementasinya:</p>
                  <div className="bg-[#171717] border border-white/8 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wide">Perubahan Aturan</span>
                      <span className="text-[10px] bg-[#007979]/20 text-[#24B1B1] border border-[#24B1B1]/30 px-2 py-0.5 rounded-full">Draft</span>
                    </div>
                    <div className="text-[12.5px] text-neutral-200">
                      <span className="line-through text-neutral-500">max_discount_allowed_pct: 15%</span>
                      <span className="ml-2 text-green-400">to 4%</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">Margin floor BNI Rp 50.000 tetap aman</div>
                  </div>
                  {chatPhase === 'plan' && (
                    <div className="flex gap-2 pt-1">
                      <button className="flex-1 py-2 rounded-lg bg-[#007979] text-white text-[13px] font-medium cursor-pointer hover:bg-[#005f5f] transition-colors">
                        Approve
                      </button>
                      <button className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-neutral-400 text-[13px] font-medium cursor-pointer">
                        Tolak
                      </button>
                    </div>
                  )}
                  {chatPhase === 'approved' && (
                    <div className="flex items-center gap-2 pt-1 text-emerald-400" style={{ animation: 'thinking-fade-up 300ms ease-out both' }}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[13px] font-medium">Disetujui — Aturan bisnis diperbarui</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/8">
          <div className="flex items-center gap-3 bg-[#212121] border border-white/10 rounded-xl px-4 py-3">
            <input
              className="flex-1 bg-transparent text-[13px] text-neutral-300 placeholder:text-neutral-600 outline-none"
              placeholder="Ketik instruksi bisnis..."
              readOnly
            />
            <Send className="w-4 h-4 text-neutral-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 2: Transaction List
// ─────────────────────────────────────────────────────────────────────────────
const TRANSACTIONS = [
  { id: 'TRX-001', member: 'Dina Kusuma', session: 'Pilates Reformer Morning', amount: 150000, status: 'EXPIRED', date: '18 Sep 2026, 08:00' },
  { id: 'TRX-002', member: 'Budi Santoso', session: 'Yoga Flow Evening', amount: 250000, status: 'PAID', date: '17 Sep 2026, 19:00' },
  { id: 'TRX-003', member: 'Citra Lestari', session: 'CrossFit Advanced', amount: 300000, status: 'PAID', date: '17 Sep 2026, 06:30' },
  { id: 'TRX-004', member: 'Eko Prasetyo', session: 'Zumba Weekend Class', amount: 120000, status: 'PENDING', date: '16 Sep 2026, 10:00' },
  { id: 'TRX-005', member: 'Farida Hanum', session: 'Pilates Reformer Morning', amount: 150000, status: 'EXPIRED', date: '16 Sep 2026, 08:00' },
  { id: 'TRX-006', member: 'Gunawan Halim', session: 'Strength Training', amount: 200000, status: 'PAID', date: '15 Sep 2026, 17:00' },
  { id: 'TRX-007', member: 'Hana Wijaya', session: 'Yoga Flow Morning', amount: 180000, status: 'PAID', date: '15 Sep 2026, 07:00' },
  { id: 'TRX-008', member: 'Ivan Kurniawan', session: 'CrossFit Beginner', amount: 175000, status: 'PENDING', date: '14 Sep 2026, 06:00' },
  { id: 'TRX-009', member: 'Julia Santoso', session: 'Pilates Reformer Evening', amount: 150000, status: 'EXPIRED', date: '14 Sep 2026, 19:00' },
  { id: 'TRX-010', member: 'Kevin Adrianah', session: 'Zumba Kids', amount: 100000, status: 'PAID', date: '13 Sep 2026, 11:00' },
];

function SceneTransactions() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    let pos = 0;
    const interval = setInterval(() => {
      pos += 1;
      if (scrollRef.current) scrollRef.current.scrollTop = pos;
    }, 30);
    const t = setTimeout(() => setShowAlert(true), 8000);
    return () => { clearInterval(interval); clearTimeout(t); };
  }, []);

  const statusBadge = (s: string) => {
    if (s === 'PAID') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s === 'PENDING') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/15 text-red-400 border-red-500/30';
  };

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 border-b border-white/8 px-6 flex items-center gap-3 shrink-0">
        <CreditCard className="w-4 h-4 text-[#24B1B1]" />
        <span className="text-sm font-semibold text-white">Riwayat Transaksi &amp; Refund</span>
        <span className="ml-auto text-[11px] text-neutral-500">FitBody Gym · September 2026</span>
      </header>

      {showAlert && (
        <div className="px-6 py-3 bg-orange-500/10 border-b border-orange-500/30 flex items-center gap-3" style={{ animation: 'thinking-fade-up 400ms ease-out both' }}>
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-[13px] text-orange-300 font-medium">AI Mendeteksi 3 member berisiko churn — tagihan VA dibiarkan kedaluwarsa</span>
          <button className="ml-auto text-[11px] text-orange-400 underline cursor-pointer">Lihat Detail</button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_1fr] gap-0 px-6 py-2 border-b border-white/8 text-[11px] font-semibold text-neutral-500 uppercase tracking-wide shrink-0">
          <span>Transaksi ID</span>
          <span>Member &amp; Sesi</span>
          <span>Jumlah</span>
          <span>Status</span>
          <span>Tanggal</span>
        </div>
        <div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100% - 40px)' }}>
          {[...TRANSACTIONS, ...TRANSACTIONS].map((trx, idx) => (
            <div
              key={`${trx.id}-${idx}`}
              className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_1fr] gap-0 px-6 py-3.5 border-b border-white/5 hover:bg-white/3 transition-colors"
            >
              <span className="text-[12px] font-mono text-neutral-400">{trx.id}</span>
              <div>
                <div className="text-[13px] font-medium text-white">{trx.member}</div>
                <div className="text-[11px] text-neutral-500">{trx.session}</div>
              </div>
              <span className="text-[13px] text-neutral-200">Rp {trx.amount.toLocaleString('id-ID')}</span>
              <span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(trx.status)}`}>
                  {trx.status}
                </span>
              </span>
              <span className="text-[12px] text-neutral-400">{trx.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 3: Cancellation Feedback Popup + Analytics AI Sub-tab
// ─────────────────────────────────────────────────────────────────────────────
function SceneFeedbackAndAnalytics() {
  const [phase, setPhase] = useState<'popup' | 'analytics'>('popup');
  const [checkedOptions, setCheckedOptions] = useState<string[]>([]);
  const [analyticsThinkingKey, setAnalyticsThinkingKey] = useState(0);
  const [showAnalysisResult, setShowAnalysisResult] = useState(false);
  const [analysisLines, setAnalysisLines] = useState<string[]>([]);

  const options = [
    'Jadwal sesi tidak sesuai dengan aktivitas saya',
    'Harga terlalu mahal untuk kondisi saat ini',
    'Pindah ke gym / studio lain yang lebih dekat',
    'Faktor pekerjaan / terlalu sibuk',
    'Lainnya',
  ];

  const analysisOutput = [
    'Analisis Pendapatan September 2026',
    '',
    '- Total VA Settled: Rp 49.229.000 (+12% dari Agustus)',
    '- Member aktif: 36.183 dari 49.229 total member',
    '- Retention rate bulan ini: 92.0%',
    '',
    'Risiko Terdeteksi',
    '- 4 member dengan VA expired perlu outreach segera',
    '- Peak session 19:00-21:00 WIB terlalu overbooked',
    '',
    'Rekomendasi AI',
    '- Tambahkan slot sesi pagi 06:00 WIB untuk mengurangi beban malam',
    '- Kirim reminder VA 24 jam sebelum expiry untuk reduce silent cancel',
    '- Diskon off-peak 10% untuk sesi Selasa-Kamis pagi dapat meningkatkan occupancy',
  ];

  useEffect(() => {
    if (phase !== 'popup') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    options.forEach((opt, i) => {
      const t = setTimeout(() => {
        setCheckedOptions(prev => [...prev, opt]);
      }, 800 + i * 400);
      timers.push(t);
    });
    const submit = setTimeout(() => setPhase('analytics'), 5500);
    timers.push(submit);
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'analytics') return;
    setAnalyticsThinkingKey(k => k + 1);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = setTimeout(() => {
      setShowAnalysisResult(true);
      analysisOutput.forEach((line, i) => {
        const inner = setTimeout(() => {
          setAnalysisLines(prev => [...prev, line]);
        }, i * 200);
        timers.push(inner);
      });
    }, 4500);
    timers.push(t);
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const sidebarItems = ['Dashboard', 'Retention Inbox', 'Analytics & AI', 'Business Logic'] as const;

  return (
    <div className="h-full flex">
      <div className="flex-1 relative">
        <div className="absolute left-0 top-0 bottom-0 w-[220px] bg-[#171717] border-r border-white/8 p-3 flex flex-col z-10">
          <div className="mb-4 px-2">
            <div className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider mb-1">FitBody Gym</div>
          </div>
          {sidebarItems.map((label, i) => (
            <div key={label} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] mb-0.5 ${
              i === 2 ? 'bg-white/8 text-white font-medium' : 'text-neutral-400'
            }`}>
              <Activity className={`w-3.5 h-3.5 ${i === 2 ? 'text-[#24B1B1]' : 'text-neutral-500'}`} />
              {label}
              {label === 'Analytics & AI' && (
                <button className="ml-auto w-4 h-4 rounded flex items-center justify-center hover:bg-white/10 cursor-pointer">
                  <Plus className="w-3 h-3 text-neutral-500" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={`absolute left-[220px] right-0 top-0 bottom-0 transition-all duration-300 ${
          phase === 'popup' ? 'filter blur-sm' : ''
        }`}>
          <header className="h-12 border-b border-white/8 px-6 flex items-center">
            <span className="text-sm font-semibold text-white">Analytics &amp; AI</span>
          </header>

          {phase === 'analytics' && (
            <div className="flex h-[calc(100%-48px)]" style={{ animation: 'thinking-fade-up 400ms ease-out both' }}>
              <div className="w-1/2 border-r border-white/8 flex flex-col">
                <div className="p-4 border-b border-white/8">
                  <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wide mb-2">Prompt</div>
                  <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-3 font-mono text-[13px] text-[#24B1B1]">
                    analisis pendapatan di sebulan terakhir ini
                    <span className="inline-block w-0.5 h-4 bg-[#24B1B1] ml-0.5 animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wide mb-3">Proses Berpikir</div>
                  <ThinkingState key={analyticsThinkingKey} variant="Reasoning" />
                </div>
              </div>

              <div className="w-1/2 p-4 overflow-y-auto">
                <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wide mb-3">Hasil Analisis</div>
                {showAnalysisResult ? (
                  <div className="space-y-1 font-mono text-[12.5px]">
                    {analysisLines.map((line, i) => (
                      <div
                        key={i}
                        className={`${
                          line === 'Analisis Pendapatan September 2026' || line === 'Risiko Terdeteksi' || line === 'Rekomendasi AI'
                            ? 'text-white font-bold mt-3'
                            : line.startsWith('-')
                            ? 'text-neutral-300 ml-2'
                            : 'text-neutral-600'
                        }`}
                        style={{ animation: 'thinking-fade-up 200ms ease-out both' }}
                      >
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[12px] text-neutral-600 italic">Menunggu hasil analisis...</div>
                )}
              </div>
            </div>
          )}
        </div>

        {phase === 'popup' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ left: '220px' }}>
            <div
              className="w-full max-w-md bg-[#212121] border border-white/12 rounded-2xl shadow-2xl overflow-hidden"
              style={{ animation: 'thinking-fade-up 400ms ease-out both' }}
            >
              <div className="px-6 py-5 border-b border-white/8">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Dina Kusuma tidak memperpanjang membership</h3>
                    <p className="text-[12px] text-neutral-400 mt-0.5">VA kedaluwarsa tanpa pembayaran · Paket 8 Sesi Pilates Reformer</p>
                  </div>
                </div>
                <div className="mt-3 p-2.5 bg-[#007979]/10 border border-[#24B1B1]/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#24B1B1]" />
                    <span className="text-[11.5px] text-[#24B1B1]">Berdasarkan riwayat transaksi terakhir, AI menyiapkan pertanyaan relevan</span>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <p className="text-[13px] font-semibold text-white mb-3">Apa alasan Dina tidak memperpanjang membership?</p>
                <div className="space-y-2">
                  {options.map((opt) => {
                    const checked = checkedOptions.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 cursor-pointer transition-colors">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-300 ${
                          checked ? 'bg-[#007979] border-[#007979]' : 'border-white/20 bg-white/3'
                        }`}>
                          {checked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-[13px] transition-colors ${checked ? 'text-white' : 'text-neutral-400'}`}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 pb-5">
                <button className="w-full py-2.5 rounded-xl bg-[#007979] text-white text-[14px] font-semibold hover:bg-[#005f5f] transition-colors cursor-pointer">
                  Kirim Feedback &amp; Generate Penawaran Retensi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 4: Portfolio Health Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function ScenePortfolioHealth() {
  const stats = [
    { label: 'Merchant Terdaftar', value: '48', sub: 'SME aktif', icon: Building2, color: 'text-[#24B1B1]' },
    { label: 'VA Turnover Bulan Ini', value: 'Rp 342jt', sub: '+18% MoM', icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'NPL Rate Aktual', value: '0.42%', sub: 'Sangat sehat', icon: ShieldCheck, color: 'text-emerald-400' },
    { label: 'Proyeksi NPL Tanpa LANJUT', value: '3.18%', sub: '7.6x lebih tinggi', icon: AlertTriangle, color: 'text-orange-400' },
  ];

  const merchants = [
    { name: 'FitBody Gym & Movement', id: 'mch-001', risk: 'WATCHLIST', retention: '88.4%', va: 'Rp 11.9jt', action: 'Monitor konversi AI, tawarkan EDC BNI' },
    { name: 'Zenith Yoga Sanctuary', id: 'mch-002', risk: 'PRIME', retention: '94.2%', va: 'Rp 8.45jt', action: 'Tawarkan program KUR Wirausaha BNI' },
    { name: 'Surabaya Iron CrossFit', id: 'mch-003', risk: 'PRIME', retention: '91.0%', va: 'Rp 6.2jt', action: 'Ekspansi cabang — eligible BNI KUR' },
    { name: 'Bandung Core Pilates', id: 'mch-004', risk: 'HIGH_ALERT', retention: '72.1%', va: 'Rp 2.1jt', action: 'Darurat: jadwalkan pertemuan RM segera' },
  ];

  const riskStyle = (r: string) => {
    if (r === 'PRIME') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (r === 'WATCHLIST') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/15 text-red-400 border-red-500/30';
  };

  return (
    <div className="h-full flex flex-col">
      <header className="h-12 border-b border-white/8 px-6 flex items-center gap-3 shrink-0">
        <Activity className="w-4 h-4 text-[#24B1B1]" />
        <span className="text-sm font-semibold text-white">Portofolio Health · BNI Ecosystem Gateway</span>
        <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Realtime</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {stats.map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-[#212121] border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-[11px] text-neutral-500">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-[11px] text-neutral-500 mt-1">{sub}</div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="text-[13px] font-bold text-emerald-400">PRIME </span>
            <span className="text-[13px] text-emerald-300/80">Ekosistem merchant dalam kondisi sehat secara keseluruhan. 2 merchant masuk watchlist untuk monitoring intensif. 1 merchant butuh intervensi RM segera.</span>
          </div>
        </div>

        <div className="bg-[#212121] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/8">
            <h3 className="text-[13px] font-semibold text-white">Merchant Health Overview</h3>
          </div>
          <div className="grid grid-cols-[1fr_0.6fr_0.6fr_0.8fr_1.2fr] px-5 py-2 border-b border-white/5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
            <span>Merchant</span>
            <span>Risk Level</span>
            <span>Retention</span>
            <span>VA Turnover</span>
            <span>Rekomendasi RM</span>
          </div>
          {merchants.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_0.6fr_0.6fr_0.8fr_1.2fr] px-5 py-3.5 border-b border-white/5 hover:bg-white/2 transition-colors">
              <div>
                <div className="text-[13px] font-medium text-white">{m.name}</div>
                <div className="text-[10px] text-neutral-500 font-mono">{m.id}</div>
              </div>
              <span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskStyle(m.risk)}`}>{m.risk}</span>
              </span>
              <span className="text-[13px] text-neutral-200">{m.retention}</span>
              <span className="text-[13px] text-neutral-200">{m.va}</span>
              <span className="text-[11.5px] text-neutral-400">{m.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
