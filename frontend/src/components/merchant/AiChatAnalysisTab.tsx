'use client';

import React, { useState, useRef, useEffect } from 'react';
import ThinkingState from '@/components/ui/thinking';
import { 
  ArrowUp, 
  RotateCcw, 
  FileSpreadsheet, 
  Download, 
  X, 
  Table, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface AiChatAnalysisTabProps {
  tenantName: string;
  tenantCategory: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function AiChatAnalysisTab({
  tenantName,
  tenantCategory
}: AiChatAnalysisTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sampleExcelRows = [
    { id: 'MBR-9021', nama: 'Kevin Sanjaya', status: 'At-Risk (High Churn)', kehadiran_7hr: '0 kali', va_status: 'Unsettled (H-2)', rekomendasi: 'Diskon 15% Flexi-Pass' },
    { id: 'MBR-9024', nama: 'Siti Nurhaliza', status: 'At-Risk (High Churn)', kehadiran_7hr: '0 kali', va_status: 'Unsettled (H-1)', rekomendasi: 'Voucher Masa Berlaku 45 Hari' },
    { id: 'MBR-8832', nama: 'Bambang Sudirman', status: 'At-Risk (Medium)', kehadiran_7hr: '1 kali', va_status: 'Pending Verification', rekomendasi: 'Reminder WhatsApp Personal' },
    { id: 'MBR-8740', nama: 'Dian Sastrowardoyo', status: 'At-Risk (Medium)', kehadiran_7hr: '1 kali', va_status: 'Unsettled (H-3)', rekomendasi: 'Intervensi Kuota Fleksibel' },
    { id: 'MBR-7120', nama: 'Aris Pratama', status: 'Active (Healthy)', kehadiran_7hr: '4 kali', va_status: 'Settled (BNI VA)', rekomendasi: 'Retained Loyalty Bonus' },
    { id: 'MBR-6911', nama: 'Maya Caroline', status: 'Active (Healthy)', kehadiran_7hr: '5 kali', va_status: 'Settled (BNI VA)', rekomendasi: 'Upsell Paket Tahunan' }
  ];

  const handleDownloadExcel = () => {
    const csvHeader = 'Member_ID,Nama,Status_Risiko,Kehadiran_7_Hari,Status_BNI_VA,Rekomendasi_Intervensi\n';
    const csvContent = sampleExcelRows.map(r => 
      `"${r.id}","${r.nama}","${r.status}","${r.kehadiran_7hr}","${r.va_status}","${r.rekomendasi}"`
    ).join('\n');

    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Analisis_Mingguan_${tenantName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        content: `Berdasarkan data 7 hari terakhir untuk ${tenantName}:

1. Metrik Utama:
- BNI VA Settlement Rate: 92.0% (34 dari 38 tagihan terbayar, +4.2%)
- Member Berisiko Churn: 4 Member (Inaktif > 14 hari berturut-turut)
- Potensi Penyelamatan MRR: Rp 2.400.000 dengan intervensi kuota fleksibel

2. Rekomendasi Tindakan:
• Kirimkan penawaran Flexi-Pass 15% ke 4 member at-risk untuk mengonversi sisa kuota menjadi masa berlaku 45 hari.
• Optimasi jadwal kelas pukul 18:30 - 20:00 dengan menambah 1 instruktur cadangan (tingkat keterisian 94%).
• Aktifkan notifikasi otomatis WhatsApp BNI VA H-2 jatuh tempo (88% settlement selesai dalam 6 jam pertama).`
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
    setShowExcelPreview(false);
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
                {/* User Message - Clean text without bubble background */}
                {msg.role === 'user' && (
                  <div className="text-right">
                    <p className="text-sm text-neutral-200 font-medium inline-block whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                )}

                {/* Assistant Message - Clean text without background */}
                {msg.role === 'assistant' && (
                  <div className="space-y-4 text-left">
                    <ThinkingState
                      variant="Reasoning"
                      customActive="Menganalisis 49.229 data transaksi BNI VA & riwayat check-in..."
                      customDone="Selesai menganalisis (3.8 detik)"
                      customRows={[
                        { primary: "Mengambil log settlement BNI VA Direct", secondary: "34 transaksi terverifikasi (92% sukses)" },
                        { primary: "Analisis drop-off kehadiran sesi sore-malam", secondary: "Teridentifikasi 4 member berisiko tinggi" },
                        { primary: "Menghitung elastisitas diskon retensi 15%", secondary: "Proyeksi penyelamatan MRR Rp 2.400.000" },
                        { primary: "Menyusun ringkasan", secondary: "Selesai" }
                      ]}
                    />

                    {/* Plain Text Output */}
                    <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Kotak Kecil Laporan Excel */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowExcelPreview(true)}
                        className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#212121] hover:bg-[#282828] border border-white/10 hover:border-emerald-500/40 transition-all shadow-md text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                              Laporan_Analisis_Mingguan.xlsx
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500">24.8 KB</span>
                          </div>
                          <span className="text-[11px] text-neutral-400 group-hover:text-neutral-300">
                            Saya sudah membuat laporan excel, klik untuk melihat
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Active Thinking State while waiting for assistant output */}
            {isThinking && (
              <div className="space-y-2 text-left animate-in fade-in duration-300">
                <ThinkingState
                  variant="Steps"
                  customActive="Sedang memproses & menganalisis riwayat transaksi 7 hari..."
                  customRows={[
                    { primary: "Menghubungkan ke API BNI Direct Sandbox" },
                    { primary: "Melakukan cross-reference absensi member" },
                    { primary: "Menghitung proyeksi risiko churn" }
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

      {/* POPUP MODAL PREVIEW EXCEL */}
      {showExcelPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setShowExcelPreview(false)} />
          <div className="relative w-full max-w-4xl bg-[#1e1e1e] border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#252525]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Laporan_Analisis_Mingguan.xlsx</h3>
                  <p className="text-xs text-neutral-400">Pratinjau Data Audit Presensi & Tagihan BNI VA Sandbox</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .CSV / Excel</span>
                </button>
                <button
                  onClick={() => setShowExcelPreview(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400 uppercase text-[11px] bg-white/[0.02]">
                    <th className="py-2.5 px-3">Member ID</th>
                    <th className="py-2.5 px-3">Nama</th>
                    <th className="py-2.5 px-3">Status Risiko</th>
                    <th className="py-2.5 px-3">Kehadiran (7 Hari)</th>
                    <th className="py-2.5 px-3">Status BNI VA</th>
                    <th className="py-2.5 px-3">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sampleExcelRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 text-white font-medium">{row.id}</td>
                      <td className="py-2.5 px-3 text-neutral-200">{row.nama}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.status.includes('High') 
                            ? 'bg-red-500/15 text-red-400 border border-red-500/25' 
                            : row.status.includes('Medium')
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">{row.kehadiran_7hr}</td>
                      <td className="py-2.5 px-3 text-neutral-300">{row.va_status}</td>
                      <td className="py-2.5 px-3 text-neutral-200 font-sans">{row.rekomendasi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-[#191919] flex items-center justify-between text-xs text-neutral-400 font-sans">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Data berhasil dikompilasi dari log transaksi BNI Direct Sandbox
              </span>
              <span>Total 6 baris sampel ditampilkan</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
