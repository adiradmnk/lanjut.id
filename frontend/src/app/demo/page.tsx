'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Smartphone,
  Store,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Send,
  CreditCard,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Clock,
  Check,
  AlertOctagon,
  Users,
  DollarSign,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function LanjutComprehensiveDemoPage() {
  // 3 Core Stakeholder Modes
  const [activeRole, setActiveRole] = useState<'MEMBER' | 'MERCHANT' | 'BNI_RM'>('MEMBER');

  // Member Simulation State (Dina)
  const [complaintInput, setComplaintInput] = useState(
    'Duh, sekarang jam 8 pagi udah harus ngantor, jadi kelas pagi sering kelewat dan rugi bayar.'
  );
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiNluResult, setAiNluResult] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [isSettlingVA, setIsSettlingVA] = useState(false);
  const [isVASuccess, setIsVASuccess] = useState(false);

  // Merchant Stats
  const [merchantStats, setMerchantStats] = useState<any>({
    total_active_members: 142,
    members_at_risk: 4,
    members_saved_by_ai: 34,
    retention_rate_pct: 88.4,
    saved_revenue_idr: 11900000,
    capacity_utilization_pct: 82,
  });

  const [retentionLogs, setRetentionLogs] = useState<any[]>([
    {
      id: 'log-01',
      member_name: 'Dina Kusuma',
      trigger_reason: 'Absen berturut-turut 3 minggu (Jatah 2/8)',
      ai_detected_issue: 'Bentrok jam kantor pagi (08:00 WIB)',
      proposed_solution: 'Pindah Kelas Malam (Kamis 19:00 WIB)',
      bni_va_status: 'PENDING_VA',
      amount_idr: 67500,
      timestamp: 'Baru saja',
    },
    {
      id: 'log-02',
      member_name: 'Budi Santoso',
      trigger_reason: 'Masa aktif habis dalam 3 hari',
      ai_detected_issue: 'Budget bulanan menipis',
      proposed_solution: 'Downgrade ke Paket 4 Sesi Fleksibel',
      bni_va_status: 'PAID_SETTLED',
      amount_idr: 250000,
      timestamp: 'Kemarin, 14:20 WIB',
    },
    {
      id: 'log-03',
      member_name: 'Citra Lestari',
      trigger_reason: 'Absen 2 minggu beruntun',
      ai_detected_issue: 'Perjalanan dinas luar kota',
      proposed_solution: 'Pause Membership 14 Hari Tanpa Biaya',
      bni_va_status: 'PAID_SETTLED',
      amount_idr: 0,
      timestamp: '3 hari lalu',
    },
  ]);

  // BNI Portfolio State
  const [bniPortfolio, setBniPortfolio] = useState<any>({
    total_sme_merchants_supervised: 48,
    total_loan_exposure_idr: 12450000000,
    portfolio_npl_rate_pct: 0.42,
    projected_npl_without_lanjut_pct: 3.18,
    total_bni_va_turnover_month_idr: 342000000,
  });

  const [bniMerchants, setBniMerchants] = useState<any[]>([
    {
      id: 'mch-001',
      name: 'FitBody Gym & Functional Movement',
      category: 'Fitness & Wellness',
      loan_plafond_idr: 350000000,
      monthly_installment_idr: 14200000,
      retention_rate_pct: 88.4,
      capacity_utilization_pct: 82,
      risk_level: 'WATCHLIST',
      early_warning_signal: '4 member mendekati renewal terancam churn',
      recommended_rm_action: 'Monitor konversi AI retention, tawarkan fasilitas EDC BNI.',
    },
    {
      id: 'mch-002',
      name: 'Kopi Kenangan Senja (SME F&B)',
      category: 'Food & Beverage',
      loan_plafond_idr: 200000000,
      monthly_installment_idr: 8500000,
      retention_rate_pct: 92.1,
      capacity_utilization_pct: 89,
      risk_level: 'LOW',
      early_warning_signal: 'Kesehatan operasional prima, repeat order tinggi',
      recommended_rm_action: 'Tawarkan program ekspansi BNI Wirausaha / KUR SME.',
    },
    {
      id: 'mch-003',
      name: 'GlowAura Skin Clinic',
      category: 'Beauty & Skincare',
      loan_plafond_idr: 450000000,
      monthly_installment_idr: 18900000,
      retention_rate_pct: 71.4,
      capacity_utilization_pct: 64,
      risk_level: 'HIGH_ALERT',
      early_warning_signal: 'Kunjungan treatment drop 28% dalam 30 hari',
      recommended_rm_action: 'PRIORITAS RM: Kunjungi merchant minggu ini untuk restrukturisasi sebelum NPL.',
    },
  ]);

  // Submit Grievance (AI + Matching Engine)
  const handleSubmitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingAI(true);
    try {
      const res = await fetch('http://localhost:5001/api/member/submit-grievance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: 'mbr-dina-01',
          complaint_text: complaintInput,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiNluResult(data.ai_nlu);
        setMatchResult(data.match_result);
      } else {
        throw new Error('Fallback needed');
      }
    } catch {
      // Graceful fallback
      setAiNluResult({
        intent: 'SCHEDULE_CONFLICT',
        category: 'Bentrok Jam Kerja / WFO Pagi',
        preferred_time_of_day: 'EVENING',
        churn_risk_score: 0.88,
        root_cause_summary: complaintInput,
        engine_source: 'Google Gemini 1.5 Flash (JSON Structured Output)',
      });
      setMatchResult({
        success: true,
        proposal: {
          id: 'prop-fitbody-01',
          target_session_title: 'Evening Functional HIIT & Reformer',
          target_session_time: 'Kamis, 19:00 - 20:00 WIB',
          price_adjustment_idr: 67500,
          discount_applied_pct: 10,
          margin_protected: true,
          bni_va_number: '988123408921',
        },
      });
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Checkout BNI Virtual Account
  const handleCheckoutVA = async () => {
    setIsSettlingVA(true);
    try {
      await fetch('http://localhost:5001/api/member/checkout-va', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: matchResult?.proposal?.id || 'prop-fitbody-01' }),
      });
    } catch {
      // Ignored
    } finally {
      setTimeout(() => {
        setIsSettlingVA(false);
        setIsVASuccess(true);

        // Update Merchant stats
        setMerchantStats((prev: any) => ({
          ...prev,
          members_at_risk: 3,
          members_saved_by_ai: 35,
          retention_rate_pct: 89.2,
          saved_revenue_idr: prev.saved_revenue_idr + 350000,
        }));

        // Update Merchant logs
        setRetentionLogs((prev) =>
          prev.map((log) =>
            log.id === 'log-01' ? { ...log, bni_va_status: 'PAID_SETTLED' } : log
          )
        );

        // Update BNI risk status for FitBody
        setBniMerchants((prev) =>
          prev.map((m) =>
            m.id === 'mch-001'
              ? {
                  ...m,
                  retention_rate_pct: 89.2,
                  risk_level: 'LOW',
                  early_warning_signal: 'Normal: Dina terselamatkan ke kelas malam via BNI VA',
                }
              : m
          )
        );
      }, 700);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#071624',
        color: '#FFFFFF',
        fontFamily: "'Mazzard H', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ══════════════════════════════════════════════════════════
          TOP NAVIGATION BAR & ROLE SELECTOR
          ══════════════════════════════════════════════════════════ */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(11, 34, 56, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.65)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} />
            Landing Page
          </Link>
          <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#24B1B1',
                boxShadow: '0 0 10px #24B1B1',
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>
              LANJUT Platform <span style={{ color: '#FFE2AF', fontWeight: 400 }}>× Bank BNI B2B2B</span>
            </span>
          </div>
        </div>

        {/* 3 Role Navigation Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '40px',
            padding: '4px',
            gap: '4px',
          }}
        >
          <button
            onClick={() => setActiveRole('MEMBER')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '30px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: activeRole === 'MEMBER' ? '#007979' : 'transparent',
              border: activeRole === 'MEMBER' ? '1px solid rgba(36, 177, 177, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Smartphone size={14} color={activeRole === 'MEMBER' ? '#FFE2AF' : '#24B1B1'} />
            1. Member (Dina HP Portal)
          </button>

          <button
            onClick={() => setActiveRole('MERCHANT')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '30px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: activeRole === 'MERCHANT' ? '#24B1B1' : 'transparent',
              border: activeRole === 'MERCHANT' ? '1px solid rgba(36, 177, 177, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Store size={14} color={activeRole === 'MERCHANT' ? '#071624' : '#FFE2AF'} />
            <span style={{ color: activeRole === 'MERCHANT' ? '#071624' : '#FFFFFF' }}>
              2. Merchant (FitBody Gym)
            </span>
          </button>

          <button
            onClick={() => setActiveRole('BNI_RM')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '30px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: activeRole === 'BNI_RM' ? '#E37434' : 'transparent',
              border: activeRole === 'BNI_RM' ? '1px solid rgba(227, 116, 52, 0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Building2 size={14} color="#FFFFFF" />
            3. Bank BNI (NPL Early Warning)
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          MAIN BODY VIEW
          ══════════════════════════════════════════════════════════ */}
      <main
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
          padding: 'clamp(24px, 4vw, 40px) 24px',
          flex: 1,
        }}
      >
        {/* =======================================================
            VIEW 1: MEMBER PORTAL (Dina's Mobile Phone Simulation)
            ======================================================= */}
        {activeRole === 'MEMBER' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '32px',
              alignItems: 'start',
            }}
          >
            {/* Left: Realistic Mobile Phone Mockup */}
            <div
              style={{
                maxWidth: '420px',
                margin: '0 auto',
                width: '100%',
                backgroundColor: '#0c1b29',
                borderRadius: '36px',
                border: '4px solid #1a3248',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Phone Speaker Notch */}
              <div
                style={{
                  height: '24px',
                  backgroundColor: '#071624',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <div style={{ width: '48px', height: '4px', backgroundColor: '#1a3248', borderRadius: '2px' }} />
              </div>

              {/* Email Trigger Simulation Banner */}
              <div
                style={{
                  backgroundColor: '#1e293b',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                    }}
                  >
                    ✉
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 600 }}>Notifikasi Email Merchant (Magic Link)</span>
                    <p style={{ fontSize: '12px', color: '#FFFFFF', lineHeight: '1.3', margin: 0 }}>
                      "Halo Dina, ada kendala dengan jadwal latihanmu di FitBody Gym?"
                    </p>
                  </div>
                </div>
                <Link
                  href="/member?member_id=mbr-dina-01"
                  target="_blank"
                  style={{
                    fontSize: '11px',
                    padding: '6px 10px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Buka Mobile ↗
                </Link>
              </div>

              {/* Mobile Web Interface (Opened without login) */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#24B1B1', fontWeight: 600, textTransform: 'uppercase' }}>
                      FitBody Gym Portal
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Halo Dina Kusuma 👋</h3>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: isVASuccess ? 'rgba(36, 177, 177, 0.2)' : 'rgba(227, 116, 52, 0.2)',
                      color: isVASuccess ? '#24B1B1' : '#FFE2AF',
                      border: isVASuccess ? '1px solid #24B1B1' : '1px solid #E37434',
                      fontWeight: 600,
                    }}
                  >
                    {isVASuccess ? 'Terbarui ✨' : 'Risiko Churn'}
                  </span>
                </div>

                {/* Member Drop Attendance Notice */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Paket Pagi (08:00 WIB)</span>
                    <span style={{ color: '#E37434', fontWeight: 600 }}>2/8 Sesi (Absen 3 Minggu)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: isVASuccess ? '100%' : '25%', height: '100%', backgroundColor: isVASuccess ? '#24B1B1' : '#E37434' }} />
                  </div>
                </div>

                {/* AI Input Form */}
                {!isVASuccess ? (
                  <form onSubmit={handleSubmitGrievance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '6px' }}>
                        Ceritakan kendalamu secara bebas:
                      </label>
                      <textarea
                        rows={3}
                        value={complaintInput}
                        onChange={(e) => setComplaintInput(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          fontSize: '12px',
                          color: '#FFFFFF',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessingAI}
                      style={{
                        padding: '12px',
                        backgroundColor: '#007979',
                        color: '#FFFFFF',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: isProcessingAI ? 'not-allowed' : 'pointer',
                        border: 'none',
                      }}
                    >
                      {isProcessingAI ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          AI Menerjemahkan & Mencari Kursi...
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          Kirim Keluhan ke Sistem
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'rgba(36, 177, 177, 0.15)',
                      border: '1px solid #24B1B1',
                      borderRadius: '14px',
                      textAlign: 'center',
                    }}
                  >
                    <CheckCircle2 size={24} color="#24B1B1" style={{ margin: '0 auto 6px' }} />
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                      Paket Berhasil Diperbarui!
                    </h4>
                    <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '2px' }}>
                      Jadwal Dina resmi aktif di kelas Kamis 19:00 WIB. Terima kasih telah menggunakan BNI Virtual Account.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Technical Explanation & Handover Pipeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Architecture Blueprint Card */}
              <div
                style={{
                  backgroundColor: '#0b2238',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={16} color="#24B1B1" />
                  <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    1. Peran AI: Natural Language Understanding (gpt-4o-mini)
                  </h4>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6', marginBottom: '12px' }}>
                  AI <strong>tidak</strong> menghitung absensi atau tagihan bank. AI bertugas menerima teks tidak beraturan dari Dina dan mengembalikannya dalam <strong>JSON Structured Output</strong>:
                </p>

                {aiNluResult ? (
                  <div
                    style={{
                      backgroundColor: '#071624',
                      borderRadius: '12px',
                      padding: '14px',
                      border: '1px solid rgba(36, 177, 177, 0.3)',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#24B1B1',
                    }}
                  >
                    <pre style={{ margin: 0 }}>
{JSON.stringify(
  {
    kategori_masalah: aiNluResult.category,
    preferensi_waktu_baru: 'MALAM (Di atas 18:00 WIB)',
    tingkat_urgensi: 'TINGGI (Berpotensi Churn)',
    confidence_score: aiNluResult.churn_risk_score,
  },
  null,
  2
)}
                    </pre>
                  </div>
                ) : (
                  <div style={{ padding: '14px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    Menunggu pengiriman keluhan pada mockup HP di samping...
                  </div>
                )}
              </div>

              {/* Handover ke Matching Engine SQL & BNI VA */}
              {matchResult && (
                <div
                  style={{
                    backgroundColor: '#0b2238',
                    borderRadius: '24px',
                    border: '1px solid rgba(36, 177, 177, 0.4)',
                    padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <ShieldCheck size={16} color="#FFE2AF" />
                    <h4 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFE2AF' }}>
                      2. Handover ke SQL Matching Engine & BNI Virtual Account
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', padding: '14px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        <span>Solusi Jadwal Ditemukan</span>
                        <span style={{ color: '#24B1B1', fontWeight: 600 }}>Tersedia 4 Kursi Kosong</span>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                        {matchResult.proposal.target_session_title}
                      </p>
                      <p style={{ fontSize: '11px', color: '#FFE2AF', marginTop: '2px' }}>
                        {matchResult.proposal.target_session_time}
                      </p>
                    </div>

                    <div
                      style={{
                        background: 'linear-gradient(90deg, rgba(0, 121, 121, 0.3), rgba(227, 116, 52, 0.2))',
                        border: '1px solid rgba(36, 177, 177, 0.4)',
                        padding: '16px',
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>
                          Tagihan BNI Virtual Account
                        </span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFE2AF' }}>
                          Rp {matchResult.proposal.price_adjustment_idr.toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>Nomor VA BNI</span>
                        <div style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF' }}>
                          {matchResult.proposal.bni_va_number}
                        </div>
                      </div>
                    </div>

                    {!isVASuccess && (
                      <button
                        onClick={handleCheckoutVA}
                        disabled={isSettlingVA}
                        style={{
                          padding: '14px',
                          background: 'linear-gradient(90deg, #007979, #24B1B1)',
                          color: '#FFFFFF',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          border: 'none',
                          cursor: isSettlingVA ? 'not-allowed' : 'pointer',
                          boxShadow: '0 8px 24px rgba(0, 121, 121, 0.4)',
                        }}
                      >
                        {isSettlingVA ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Memproses Webhook Settlement BNI VA...
                          </>
                        ) : (
                          <>
                            <CreditCard size={15} />
                            [ Setuju & Perbarui Paket via BNI VA ]
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =======================================================
            VIEW 2: MERCHANT DASHBOARD (FitBody Gym Business Owner)
            ======================================================= */}
        {activeRole === 'MERCHANT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Merchant Banner */}
            <div
              style={{
                backgroundColor: '#0b2238',
                borderRadius: '24px',
                border: '1px solid rgba(36, 177, 177, 0.3)',
                padding: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#24B1B1', fontWeight: 600 }}>
                  Merchant Partner Console (Desktop)
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                  FitBody Gym & Functional Movement
                </h2>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.65)' }}>
                  Pantau penyelamatan retensi member dan utilisasi kapasitas kelas tanpa rugi margin.
                </p>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(36, 177, 177, 0.15)',
                  color: '#24B1B1',
                  border: '1px solid rgba(36, 177, 177, 0.3)',
                }}
              >
                Rekening Penampung: BNI 0823419082
              </span>
            </div>

            {/* Merchant Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div style={{ backgroundColor: '#0b2238', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Total Member Aktif</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
                  {merchantStats.total_active_members}
                </div>
              </div>

              <div style={{ backgroundColor: '#0b2238', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Member Hampir Churn</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#E37434', marginTop: '6px' }}>
                  {merchantStats.members_at_risk}
                </div>
              </div>

              <div style={{ backgroundColor: '#0b2238', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Diselamatkan oleh AI</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#24B1B1', marginTop: '6px' }}>
                  {merchantStats.members_saved_by_ai}
                </div>
              </div>

              <div style={{ backgroundColor: '#0b2238', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Omzet Retensi Terselamatkan</span>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFE2AF', marginTop: '6px' }}>
                  Rp {merchantStats.saved_revenue_idr.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Retention History Table */}
            <div style={{ backgroundColor: '#0b2238', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                Riwayat Interaksi Penyelamatan Pelanggan (GET /api/merchant/retention-logs)
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.5)' }}>
                      <th style={{ padding: '12px 8px' }}>Nama Member</th>
                      <th style={{ padding: '12px 8px' }}>Pemicu Drop Absensi</th>
                      <th style={{ padding: '12px 8px' }}>Kendala NLU (AI)</th>
                      <th style={{ padding: '12px 8px' }}>Solusi Pencocokan</th>
                      <th style={{ padding: '12px 8px' }}>Status BNI VA</th>
                      <th style={{ padding: '12px 8px' }}>Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 8px', fontWeight: 600, color: '#FFFFFF' }}>{log.member_name}</td>
                        <td style={{ padding: '14px 8px', color: 'rgba(255, 255, 255, 0.7)' }}>{log.trigger_reason}</td>
                        <td style={{ padding: '14px 8px', color: '#FFE2AF' }}>{log.ai_detected_issue}</td>
                        <td style={{ padding: '14px 8px', color: '#24B1B1' }}>{log.proposed_solution}</td>
                        <td style={{ padding: '14px 8px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor:
                                log.bni_va_status === 'PAID_SETTLED' ? 'rgba(36, 177, 177, 0.15)' : 'rgba(227, 116, 52, 0.15)',
                              color: log.bni_va_status === 'PAID_SETTLED' ? '#24B1B1' : '#E37434',
                            }}
                          >
                            {log.bni_va_status === 'PAID_SETTLED' ? '✓ SETTLED' : 'PENDING'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', color: 'rgba(255, 255, 255, 0.4)' }}>{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================
            VIEW 3: BANK BNI DASHBOARD (Relationship Manager / NPL Early Warning)
            ======================================================= */}
        {activeRole === 'BNI_RM' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* BNI RM Top Executive Header */}
            <div
              style={{
                background: 'linear-gradient(90deg, #E37434 0%, #0b2238 100%)',
                borderRadius: '24px',
                border: '1px solid rgba(227, 116, 52, 0.4)',
                padding: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.1em' }}>
                  Bank BNI Commercial & SME Division
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                  Relationship Manager (RM) Early Warning System
                </h2>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  Deteksi dini penurunan operasional UMKM binaan sebelum terjadi kredit macet (NPL).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(0, 0, 0, 0.4)', color: '#FFFFFF', fontSize: '11px', fontWeight: 600 }}>
                  NPL Portfolio: {bniPortfolio.portfolio_npl_rate_pct}% (Aman)
                </span>
                <span style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(0, 0, 0, 0.4)', color: '#FFE2AF', fontSize: '11px', fontWeight: 600 }}>
                  SME Terawasi: {bniPortfolio.total_sme_merchants_supervised} Merchant
                </span>
              </div>
            </div>

            {/* BNI Macro Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div style={{ backgroundColor: '#0b2238', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Total Plafon Kredit UMKM</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
                  Rp {(bniPortfolio.total_loan_exposure_idr / 1000000000).toFixed(2)} Miliar
                </div>
              </div>

              <div style={{ backgroundColor: '#0b2238', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Tingkat NPL Nyata vs Proyeksi</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#24B1B1', marginTop: '6px' }}>
                  {bniPortfolio.portfolio_npl_rate_pct}% <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>vs 3.18% (Tanpa LANJUT)</span>
                </div>
              </div>

              <div style={{ backgroundColor: '#0b2238', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Omzet BNI VA Bulan Ini</span>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFE2AF', marginTop: '6px' }}>
                  Rp {(bniPortfolio.total_bni_va_turnover_month_idr / 1000000).toFixed(1)} Juta
                </div>
              </div>
            </div>

            {/* Merchant Early Warning Table */}
            <div style={{ backgroundColor: '#0b2238', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                Daftar Pengawasan Merchant & Sinyal Risiko Dini (GET /api/bni/merchant-list)
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.5)' }}>
                      <th style={{ padding: '12px 8px' }}>Merchant</th>
                      <th style={{ padding: '12px 8px' }}>Plafon BNI</th>
                      <th style={{ padding: '12px 8px' }}>Cicilan / Bulan</th>
                      <th style={{ padding: '12px 8px' }}>Tingkat Retensi</th>
                      <th style={{ padding: '12px 8px' }}>Status Risiko</th>
                      <th style={{ padding: '12px 8px' }}>Sinyal Operasional Dini</th>
                      <th style={{ padding: '12px 8px' }}>Rekomendasi Tindakan RM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bniMerchants.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 8px', fontWeight: 600, color: '#FFFFFF' }}>{m.name}</td>
                        <td style={{ padding: '14px 8px', color: 'rgba(255, 255, 255, 0.7)' }}>Rp {(m.loan_plafond_idr / 1000000).toFixed(0)} Juta</td>
                        <td style={{ padding: '14px 8px', color: 'rgba(255, 255, 255, 0.7)' }}>Rp {(m.monthly_installment_idr / 1000000).toFixed(1)} Juta</td>
                        <td style={{ padding: '14px 8px', color: '#24B1B1', fontWeight: 700 }}>{m.retention_rate_pct}%</td>
                        <td style={{ padding: '14px 8px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor:
                                m.risk_level === 'LOW'
                                  ? 'rgba(36, 177, 177, 0.15)'
                                  : m.risk_level === 'WATCHLIST'
                                  ? 'rgba(255, 226, 175, 0.15)'
                                  : 'rgba(227, 116, 52, 0.2)',
                              color:
                                m.risk_level === 'LOW'
                                  ? '#24B1B1'
                                  : m.risk_level === 'WATCHLIST'
                                  ? '#FFE2AF'
                                  : '#E37434',
                            }}
                          >
                            {m.risk_level}
                          </span>
                        </td>
                        <td style={{ padding: '14px 8px', color: 'rgba(255, 255, 255, 0.8)' }}>{m.early_warning_signal}</td>
                        <td style={{ padding: '14px 8px', color: '#FFE2AF', maxWidth: '280px' }}>{m.recommended_rm_action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
