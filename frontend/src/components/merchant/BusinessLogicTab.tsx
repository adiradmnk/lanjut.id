'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Cpu, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  Percent, 
  Coins, 
  Clock, 
  RefreshCw,
  BookOpen,
  Sliders
} from 'lucide-react';
import ThinkingState from '@/components/ui/thinking';

interface BusinessLogicTabProps {
  tenantId: string;
  tenantName: string;
  tenantCategory: string;
}

export default function BusinessLogicTab({ tenantId, tenantName, tenantCategory }: BusinessLogicTabProps) {
  // State Active Rules & Guidebook
  const [activeRules, setActiveRules] = useState<any>(null);
  const [tenantConfig, setTenantConfig] = useState<any>({
    max_discount_allowed_pct: 15.0,
    min_margin_floor_idr: 50000.0,
    auto_intervention_threshold_days: 21
  });
  const [latestGuidebook, setLatestGuidebook] = useState<any>(null);
  const [isLoadingRules, setIsLoadingRules] = useState(true);

  // State Ingestion / Upload Guidebook
  const [file, setFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'ANALYZING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [uploadMessage, setUploadMessage] = useState('');
  const [engineSource, setEngineSource] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Chatbot Business Logic
  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
    status?: 'ACCEPTED' | 'REJECTED' | 'INQUIRY_ANSWER';
    guardrail?: any;
    mutation_diff?: string[];
  }>>([
    {
      sender: 'assistant',
      text: `Halo ${tenantName}! Saya AI Business Logic Guardian dari LANJUT × BNI Ecosystem. Saya siap membantu menyesuaikan aturan retensi, diskon maksimal, atau katalog paket Anda dengan tetap mematuhi margin floor perbankan BNI. Apa yang ingin Anda sesuaikan hari ini?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'INQUIRY_ANSWER'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [thinkingKey, setThinkingKey] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch Business Rules dari Backend
  const fetchBusinessRules = async () => {
    setIsLoadingRules(true);
    try {
      const res = await fetch(`/api/merchant/${tenantId}/business-rules`);
      if (res.ok) {
        const data = await res.json();
        if (data.active_rules) setActiveRules(data.active_rules);
        if (data.config) setTenantConfig(data.config);
        if (data.latest_guidebook) setLatestGuidebook(data.latest_guidebook);
      }
    } catch (err) {
      console.warn('Gagal memuat aturan bisnis:', err);
    } finally {
      setIsLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchBusinessRules();
  }, [tenantId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle File Upload Guidebook
  const handleUploadGuidebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('ANALYZING');
    setUploadMessage('AI Document Intelligence sedang mengekstrak katalog, margin floor, dan klausul retensi...');

    const formData = new FormData();
    formData.append('file', file);
    if (uploadNotes) {
      formData.append('notes', uploadNotes);
    }

    try {
      const res = await fetch(`/api/merchant/${tenantId}/guidebook`, {
        method: 'POST',
        body: formData,
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server tidak merespons dengan format yang diharapkan (HTTP ${res.status}). Coba lagi atau gunakan file yang lebih kecil.`);
      }
      if (res.ok && data.status === 'success') {
        setUploadStatus('SUCCESS');
        setUploadMessage(`Berhasil dianalisis! Dokumen "${file.name}" telah mengkonfigurasi ulang baseline aturan bisnis Anda.`);
        if (data.extracted_rules) setActiveRules(data.extracted_rules);
        if (data.tenant_config) setTenantConfig(data.tenant_config);
        if (data.engine_source) setEngineSource(data.engine_source);
        if (data.guidebook) setLatestGuidebook(data.guidebook);

        // Tambahkan pengumuman ke Chatbot
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `Saya telah selesai menganalisis guidebook "${file.name}". Aturan bisnis, katalog layanan, dan guardrail margin BNI (${tenantConfig.min_margin_floor_idr ? 'Rp ' + Number(tenantConfig.min_margin_floor_idr).toLocaleString('id-ID') : 'Rp 50.000'}) telah disinkronisasi ke sistem LANJUT.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'ACCEPTED'
          }
        ]);
        setFile(null);
        setUploadNotes('');
      } else {
        setUploadStatus('ERROR');
        setUploadMessage(data.message || 'Gagal memproses berkas guidebook. Silakan periksa format dokumen.');
      }
    } catch (err: any) {
      setUploadStatus('ERROR');
      setUploadMessage(err.message || 'Terjadi kesalahan jaringan saat mengunggah.');
    } finally {
      setIsUploading(false);
    }
  };

  // Sample Guidebook Ingestion (Demo / Quick-Start)
  const handleUseSampleGuidebook = async () => {
    setIsUploading(true);
    setUploadStatus('ANALYZING');
    setUploadMessage('Menghubungkan dokumen katalog resmi merchant BNI...');

    const sampleContent = `
    DOKUMEN PANDUAN OPERASIONAL & KATALOG LAYANAN (PKS BNI ECOSYSTEM)
    Nama Bisnis: ${tenantName}
    Kategori Industri: ${tenantCategory}
    Batas Margin Floor Pinjaman BNI: Rp 50.000,- per sesi
    Batas Diskon Retensi Maksimal: 15%
    Ambang Hari Intervensi Inaktivitas: 21 hari

    KATALOG PAKET LAYANAN:
    1. Paket Morning Reformer Pilates - Rp 150.000 / sesi (Kuota 10 sesi, Masa aktif 30 hari)
    2. Paket De-Stress Evening Flow - Rp 165.000 / sesi (Kuota 12 sesi, Masa aktif 30 hari)
    3. Paket All-Access VIP Pass - Rp 1.250.000 / bulan (Unlimited access)

    KEBIJAKAN RETENSI & PEMBATALAN:
    - Member dapat membekukan (freeze) langganan maksimal 30 hari tanpa biaya tambahan.
    - Reschedule jadwal diperbolehkan dengan pemberitahuan minimal 12 jam sebelum sesi.
    - Pembatalan karena alasan harga (price sensitivity): tawarkan diskon retensi maksimal 15%.
    - Pembatalan karena jadwal bentrok (schedule conflict): alihkan ke sesi low-occupancy dengan gratis 1 sesi pendamping.
    - Pembatalan karena cedera/kesehatan: tawarkan opsi pembekuan akun 60 hari.
    `;

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const sampleFile = new File([blob], `${tenantId}_katalog_resmi.txt`, { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', sampleFile);
    formData.append('notes', 'Inisialisasi katalog merchant resmi via BNI Payment Gateway Onboarding');

    try {
      const res = await fetch(`/api/merchant/${tenantId}/guidebook`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setUploadStatus('SUCCESS');
        setUploadMessage(`Guidebook katalog resmi untuk ${tenantName} berhasil diekstrak oleh AI!`);
        if (data.extracted_rules) setActiveRules(data.extracted_rules);
        if (data.tenant_config) setTenantConfig(data.tenant_config);
        if (data.engine_source) setEngineSource(data.engine_source);
        if (data.guidebook) setLatestGuidebook(data.guidebook);

        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `Katalog panduan onboarding ${tenantName} berhasil diaktivasi! Aturan finansial telah disesuaikan dengan plafon pinjaman BNI Anda.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'ACCEPTED'
          }
        ]);
      }
    } catch (err: any) {
      setUploadStatus('ERROR');
      setUploadMessage('Gagal menganalisis dokumen sample.');
    } finally {
      setIsUploading(false);
    }
  };

  // Send Message to Chatbot Business Logic
  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || inputMessage;
    if (!textToSend.trim() || isSendingChat) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!presetText) setInputMessage('');
    setIsSendingChat(true);
    setThinkingKey(k => k + 1);

    try {
      const res = await fetch(`/api/merchant/${tenantId}/chat-instruction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      const data = await res.json();
      if (res.ok && data) {
        const replyText = data.reply_message || data.response?.assistant_reply || 'Instruksi berhasil diproses.';
        const status = data.status || 'ACCEPTED';
        const guardrail = data.guardrail_report || {};
        const mutationDiff = data.mutation_diff || [];

        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: status as any,
            guardrail: guardrail,
            mutation_diff: mutationDiff
          }
        ]);

        // Jika mutasi disetujui, perbarui data state aturan aktif
        if (status === 'ACCEPTED' && data.updated_rules) {
          setActiveRules(data.updated_rules);
          if (data.updated_rules.financial_constraints) {
            setTenantConfig((prev: any) => ({
              ...prev,
              max_discount_allowed_pct: data.updated_rules.financial_constraints.max_discount_allowed_pct || prev.max_discount_allowed_pct,
              min_margin_floor_idr: data.updated_rules.financial_constraints.min_margin_floor_idr || prev.min_margin_floor_idr
            }));
          }
        }
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: 'Maaf, terjadi gangguan saat menghubungi AI Engine asisten logika bisnis. Silakan coba kembali.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'REJECTED'
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Gagal terhubung dengan server backend.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'REJECTED'
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      
      {/* HEADER TITLE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#2e2e2e] text-[#fafafa] border border-white/10">
              End-to-End AI Engine
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#a1a1a1]">
              <ShieldCheck className="w-3.5 h-3.5 text-white" /> BNI Margin Safeguard Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5">
            Business Logic & Guidebook Ingestion
          </h1>
          <p className="text-xs text-[#a1a1a1] mt-1 max-w-2xl">
            Inisialisasi logika bisnis dari file katalog/SOP saat pendaftaran payment gateway BNI, 
            lalu modifikasi aturan retensi secara cerdas lewat percakapan AI dengan proteksi margin perbankan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBusinessRules}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-[#2e2e2e] hover:bg-white/15 text-white transition-colors cursor-pointer border border-white/10"
            title="Refresh Aturan Bisnis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRules ? 'animate-spin' : ''}`} />
            Sync Rules
          </button>
        </div>
      </div>

      {/* TOP STATS CARDS: FINANCIAL CONSTRAINTS & BNI SAFEGUARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Max Discount */}
        <div className="p-4 rounded-xl bg-[#212121] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium text-[#a1a1a1]">Max Retention Discount</span>
            <Percent className="w-4 h-4 text-white" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {tenantConfig.max_discount_allowed_pct || 15}%
            </div>
            <p className="text-[11px] text-[#a1a1a1] mt-1">
              Batas diskon maksimal yang diizinkan AI saat menawarkan penawaran penyelamatan.
            </p>
          </div>
        </div>

        {/* Card 2: Min Margin Floor */}
        <div className="p-4 rounded-xl bg-[#212121] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium text-[#a1a1a1]">BNI Profit Floor (Min)</span>
            <Coins className="w-4 h-4 text-white" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              Rp {Number(tenantConfig.min_margin_floor_idr || 50000).toLocaleString('id-ID')}
            </div>
            <p className="text-[11px] text-[#a1a1a1] mt-1">
              Batas margin bawah untuk melindungi cicilan pinjaman BNI merchant.
            </p>
          </div>
        </div>

        {/* Card 3: Auto-Intervention Trigger */}
        <div className="p-4 rounded-xl bg-[#212121] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium text-[#a1a1a1]">Intervention Window</span>
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {tenantConfig.auto_intervention_threshold_days || 21} Hari
            </div>
            <p className="text-[11px] text-[#a1a1a1] mt-1">
              Jarak inaktivitas member sebelum AI dispatch penawaran proaktif.
            </p>
          </div>
        </div>

        {/* Card 4: Ingestion Status */}
        <div className="p-4 rounded-xl bg-[#212121] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-medium text-[#a1a1a1]">Guidebook Grounding</span>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-sm font-bold text-white truncate max-w-[150px]">
                {latestGuidebook?.filename || 'Active Baseline'}
              </div>
            </div>
            <p className="text-[11px] text-[#a1a1a1] mt-1">
              {latestGuidebook ? 'Dokumen terverifikasi RAG' : 'Aturan baseline terpasang'}
            </p>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE: 1) GUIDEBOOK INGESTION & 2) CHATBOT BUILDER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: GUIDEBOOK INGESTION & ACTIVE RULES INSPECTOR (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* SECTION 1: INGESTION UPLOAD CARD */}
          <div className="p-5 rounded-2xl bg-[#212121] border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2e2e2e] flex items-center justify-center text-white border border-white/10">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Ingestion Guidebook Merchant</h3>
                  <p className="text-[11px] text-[#a1a1a1]">Upload katalog produk / SOP onboarding BNI</p>
                </div>
              </div>
              <button
                onClick={handleUseSampleGuidebook}
                disabled={isUploading}
                className="text-[11px] text-white hover:underline font-medium cursor-pointer disabled:opacity-50"
              >
                Gunakan Contoh
              </button>
            </div>

            <form onSubmit={handleUploadGuidebook} className="flex flex-col gap-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  file ? 'border-white/40 bg-[#2e2e2e]/40' : 'border-white/10 hover:border-white/20 bg-black/20'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".pdf,.docx,.doc,.txt,.md"
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setUploadStatus('IDLE');
                    }
                  }}
                />
                <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                {file ? (
                  <div className="text-xs">
                    <p className="font-semibold text-white truncate max-w-[240px] mx-auto">{file.name}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB • Klik untuk mengganti</p>
                  </div>
                ) : (
                  <div className="text-xs">
                    <p className="font-medium text-white">Tarik & letakkan file atau klik untuk memilih</p>
                    <p className="text-[11px] text-[#a1a1a1] mt-0.5">Mendukung PDF, DOCX, atau TXT katalog produk (Maks 20MB)</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[#a1a1a1]">Catatan Tambahan Merchant (Opsional)</label>
                <input 
                  type="text"
                  placeholder="Contoh: Tambahan kebijakan diskon promo Ramadhan 2026..."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="w-full bg-[#171717] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/30"
                />
              </div>

              <button
                type="submit"
                disabled={!file || isUploading}
                className="w-full py-2.5 px-4 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Menganalisis Dokumen via Gemini RAG...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analisis Guidebook & Ekstrak Aturan
                  </>
                )}
              </button>
            </form>

            {/* Ingestion Feedback Message */}
            {uploadStatus !== 'IDLE' && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                uploadStatus === 'SUCCESS' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' :
                uploadStatus === 'ERROR' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' :
                'bg-blue-500/10 border border-blue-500/30 text-blue-300'
              }`}>
                {uploadStatus === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> :
                 uploadStatus === 'ERROR' ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
                 <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />}
                <div>
                  <p className="font-medium">{uploadMessage}</p>
                  {engineSource && <p className="text-[10px] opacity-80 mt-0.5">Engine: {engineSource}</p>}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ACTIVE BUSINESS RULES INSPECTOR */}
          <div className="p-5 rounded-2xl bg-[#212121] border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white">Inspektur Aturan Aktif (Live Grounding)</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            {isLoadingRules ? (
              <div className="py-8 text-center text-xs text-[#a1a1a1]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Memuat struktur aturan bisnis...
              </div>
            ) : activeRules ? (
              <div className="flex flex-col gap-3 text-xs">
                
                {/* Profile Snapshot */}
                <div className="p-3 rounded-xl bg-[#171717] border border-white/10 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-semibold text-[#787878] tracking-wider">Business Profile</span>
                  <div className="font-semibold text-white">{activeRules.business_profile?.business_name || tenantName}</div>
                  <div className="text-[#a1a1a1] text-[11px]">{activeRules.business_profile?.category || tenantCategory}</div>
                  {activeRules.business_profile?.summary && (
                    <p className="text-[11px] text-neutral-400 mt-1 italic">"{activeRules.business_profile.summary}"</p>
                  )}
                </div>

                {/* Product Catalog Items */}
                {activeRules.product_catalog && activeRules.product_catalog.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#171717] border border-white/10 flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-semibold text-[#787878] tracking-wider">
                      Katalog Layanan ({activeRules.product_catalog.length} Produk Terdeteksi)
                    </span>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeRules.product_catalog.map((prod: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#2e2e2e]/50 border border-white/5">
                          <div>
                            <div className="font-medium text-white truncate max-w-[170px]">{prod.name}</div>
                            <div className="text-[10px] text-[#a1a1a1]">
                              {prod.quota_sessions ? `${prod.quota_sessions} Sesi` : 'Akses Penuh'} • {prod.validity_days || 30} Hari
                            </div>
                          </div>
                          <div className="text-right font-semibold text-white">
                            Rp {Number(prod.price_idr || 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Retention & Cancellation Policies */}
                <div className="p-3 rounded-xl bg-[#171717] border border-white/10 flex flex-col gap-2">
                  <span className="text-[10px] uppercase font-semibold text-[#787878] tracking-wider">Kebijakan Retensi & Jeda</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-[#2e2e2e]/50">
                      <span className="text-[#a1a1a1] block text-[10px]">Freeze / Jeda</span>
                      <span className="font-semibold text-white">
                        {activeRules.retention_policy?.free_freeze_allowed ? `Boleh (Maks ${activeRules.retention_policy?.max_freeze_days || 30} Hari)` : 'Tidak Diizinkan'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#2e2e2e]/50">
                      <span className="text-[#a1a1a1] block text-[10px]">Izin Reschedule</span>
                      <span className="font-semibold text-white">
                        {activeRules.retention_policy?.allow_reschedule ? 'Diizinkan' : 'Terkunci'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#a1a1a1]">
                Belum ada aturan khusus. Unggah dokumen guidebook untuk grounding cerdas.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: CHATBOT BUSINESS LOGIC BUILDER (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col h-[740px] rounded-2xl bg-[#212121] border border-white/10 overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-4 bg-[#2e2e2e] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Conversational Business Logic Builder</h3>
                <p className="text-[11px] text-[#a1a1a1]">Natural Language Tool Calling & Financial Margin Guardrail</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              BNI Guardrail Protected
            </div>
          </div>

          {/* Quick Preset Prompts */}
          <div className="px-4 py-2 bg-[#171717] border-b border-white/5 flex items-center gap-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden">
            <span className="text-[10px] uppercase font-semibold text-[#787878] tracking-wider shrink-0">Coba Cepat:</span>
            <button
              onClick={() => handleSendChat('Ubah batas diskon retensi maksimal jadi 20%')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#2e2e2e] hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0 border border-white/5"
            >
              "Diskon retensi 20%"
            </button>
            <button
              onClick={() => handleSendChat('Taikkan minimal margin floor menjadi Rp 65.000')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#2e2e2e] hover:bg-white/15 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0 border border-white/5"
            >
              "Margin floor Rp 65.000"
            </button>
            <button
              onClick={() => handleSendChat('Beri diskon 45% untuk semua member yang mau batal')}
              className="text-[11px] px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer shrink-0 border border-rose-500/20"
              title="Uji coba pelanggaran batas margin BNI"
            >
              "Uji Guardrail (Diskon 45%)"
            </button>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#171717]">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                    msg.sender === 'user'
                      ? 'bg-white text-black font-medium rounded-tr-xs shadow-sm'
                      : 'bg-[#212121] text-white border border-white/10 rounded-tl-xs'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Mutasi Diff Tag (Jika ACCEPTED) */}
                  {msg.mutation_diff && msg.mutation_diff.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-col gap-1">
                      <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Mutasi Berhasil Diaplikasikan:
                      </span>
                      {msg.mutation_diff.map((diff, dIdx) => (
                        <div key={dIdx} className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                          {diff}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Guardrail Rejection Tag (Jika REJECTED) */}
                  {msg.status === 'REJECTED' && msg.guardrail && (
                    <div className="mt-2.5 pt-2.5 border-t border-rose-500/20 flex flex-col gap-1">
                      <span className="text-[10px] font-semibold tracking-wider text-rose-400 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Proteksi Margin Pinjaman BNI:
                      </span>
                      <p className="text-[11px] text-rose-300 bg-rose-500/10 px-2 py-1.5 rounded border border-rose-500/20">
                        {msg.guardrail.violations?.[0] || 'Permintaan perubahan melebihi batas toleransi risiko kredit UMKM BNI.'}
                      </p>
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-neutral-500 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {isSendingChat && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#007979] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-[#2e2e2e] border border-white/10 rounded-2xl rounded-tl-none px-4 py-3" style={{ maxWidth: '480px' }}>
                    <ThinkingState key={thinkingKey} variant="Steps" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-[#212121] border-t border-white/10">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2 bg-[#171717] border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-white/30 transition-colors"
            >
              <input
                type="text"
                placeholder="Ketik instruksi aturan bisnis, misal: 'Taikkan diskon retensi jadi 18%'..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSendingChat}
                className="flex-1 bg-transparent py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isSendingChat}
                className="p-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-[#a1a1a1] mt-2 px-1">
              <span>Instruksi diproses langsung oleh LangChain Agent dengan Gemini Tool Calling.</span>
              <span className="text-white font-medium">Batas Margin Floor BNI: Rp 50.000</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
