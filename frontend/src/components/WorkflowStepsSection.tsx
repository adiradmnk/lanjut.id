'use client';

import React from 'react';
import { Search, MessageSquare, ShieldCheck, Building2, ArrowRight, Sparkles, CreditCard, ChevronRight } from 'lucide-react';

export default function WorkflowStepsSection() {
  const steps = [
    {
      step: '01',
      badge: 'Deteksi Otomatis',
      title: 'Automated Churn Trigger',
      desc: 'Sistem memindai database absensi secara berkala. Saat Dina terdeteksi absen 3 minggu berturut-turut menjelang renewal, statusnya otomatis ditandai sebagai Churn Risk.',
      icon: Search,
      color: '#E37434',
      bg: 'rgba(227, 116, 52, 0.15)',
      role: 'Database Merchant (SQL)',
    },
    {
      step: '02',
      badge: 'Sapaan WA & AI NLU',
      title: 'WhatsApp Link & NLU Translation',
      desc: 'Pesan ramah personal terkirim atas nama FitBody Gym. Dina mengeklik link dan curhat bebas: "Jam 8 pagi udah harus ngantor". AI gpt-4o-mini menerjemahkannya ke JSON: SCHEDULE_CONFLICT, butuh kelas malam.',
      icon: MessageSquare,
      color: '#24B1B1',
      bg: 'rgba(36, 177, 177, 0.15)',
      role: 'Google Gemini / gpt-4o-mini NLU',
    },
    {
      step: '03',
      badge: 'Pencocokan & BNI VA',
      title: 'Capacity Matching & 1-Click Settlement',
      desc: 'Algoritma SQL mencocokkan sisa kursi kelas malam (Kamis 19:00 WIB, sisa 4 kursi) dengan proteksi margin keuntungan merchant. Dina klik Setuju, langsung terbit nomor BNI Virtual Account.',
      icon: CreditCard,
      color: '#FFE2AF',
      bg: 'rgba(255, 226, 175, 0.15)',
      role: 'Deterministic Matching & BNI VA',
    },
    {
      step: '04',
      badge: 'Pengawasan Kredit Bank',
      title: 'BNI RM Early Warning Intelligence',
      desc: 'Penyelamatan retensi Dina seketika tersinkronisasi ke Dashboard RM BNI. Skor kesehatan portofolio FitBody Gym terpantau hijau, menekan risiko kredit macet (NPL) tanpa melanggar privasi data.',
      icon: Building2,
      color: '#007979',
      bg: 'rgba(0, 121, 121, 0.25)',
      role: 'Relationship Manager Executive Panel',
    },
  ];

  return (
    <section
      id="workflow"
      style={{
        backgroundColor: '#071624',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 64px)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px, 5vw, 64px)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(36, 177, 177, 0.15)',
              border: '1px solid rgba(36, 177, 177, 0.35)',
              color: '#24B1B1',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={14} />
            End-to-End Autonomous Workflow
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.8vw, 44px)',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 auto 16px',
              maxWidth: '820px',
            }}
          >
            Dari Sapaan WhatsApp hingga Tagihan BNI VA & Sinyal RM
          </h2>
          <p
            style={{
              fontSize: 'clamp(14px, 1.2vw, 17px)',
              color: 'rgba(255, 255, 255, 0.65)',
              maxWidth: '720px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Simulasi nyata alur penyelamatan member Dina di FitBody Gym yang terhubung langsung ke ekosistem perbankan BNI.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}
        >
          {steps.map((s, idx) => {
            const IconComponent = s.icon;
            return (
              <div
                key={s.step}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s, border-color 0.2s',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span
                      style={{
                        fontSize: '24px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: s.color,
                        opacity: 0.8,
                      }}
                    >
                      {s.step}
                    </span>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: s.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: s.color,
                      }}
                    >
                      <IconComponent size={18} />
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      color: s.color,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    {s.badge}
                  </span>

                  <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.3, marginBottom: '12px' }}>
                    {s.title}
                  </h3>

                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
                    {s.desc}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '20px',
                    paddingTop: '14px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  Layer: <span style={{ color: '#FFE2AF' }}>{s.role}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
