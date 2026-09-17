'use client';

import React from 'react';
import { Smartphone, Store, Building2, Check, ArrowUpRight } from 'lucide-react';

export default function ValueMatrixSection() {
  const cards = [
    {
      role: 'Member End-User',
      title: 'Pelanggan Langganan',
      tag: 'Bebas Ribet & Adil',
      color: '#24B1B1',
      bg: 'rgba(36, 177, 177, 0.12)',
      border: 'rgba(36, 177, 177, 0.35)',
      icon: Smartphone,
      benefits: [
        'Tidak perlu berhenti langganan saat jam kerja berubah ke WFO.',
        'Curhat bebas dalam bahasa sehari-hari tanpa harus mengisi form survei kaku.',
        'Prorata penyesuaian biaya transparan dengan diskon adil.',
        'Pembayaran 1-klik instan melalui BNI Virtual Account (test mode).',
      ],
      impact: 'Zero Effort Retention',
    },
    {
      role: 'Merchant UMKM Partner',
      title: 'Pemilik Bisnis Studio / Gym',
      tag: 'Autonomous Retention',
      color: '#FFE2AF',
      bg: 'rgba(255, 226, 175, 0.12)',
      border: 'rgba(255, 226, 175, 0.35)',
      icon: Store,
      benefits: [
        'Penyelamatan pelanggan berjalan otonom 24/7 di latar belakang.',
        'Mengisi kursi-kursi kosong di kelas malam tanpa kanibalisasi harga.',
        'Proteksi margin keuntungan minimum (zero loss guarantee).',
        'Omzet langganan bulanan terkunci dan saldo masuk ke rekening BNI.',
      ],
      impact: 'Retention Rate 88.4% → 96%',
    },
    {
      role: 'Bank BNI (Enterprise Buyer)',
      title: 'Relationship Manager (RM) SME',
      tag: 'Early Warning Intelligence',
      color: '#E37434',
      bg: 'rgba(227, 116, 52, 0.15)',
      border: 'rgba(227, 116, 52, 0.35)',
      icon: Building2,
      benefits: [
        'Early Warning Radar mendeteksi penurunan usaha 30-60 hari sebelum NPL.',
        'Peningkatan fee-based income lewat transaksi harian BNI Virtual Account.',
        'RM mendapatkan rekomendasi proaktif merchant mana yang siap ekspansi KUR.',
        'Kepatuhan penuh UU PDP (data diagregasi tanpa membocorkan privasi individu).',
      ],
      impact: 'NPL Diproyeksikan Turun < 0.5%',
    },
  ];

  return (
    <section
      id="value-matrix"
      style={{
        backgroundColor: '#071624',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 64px)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px, 5vw, 64px)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 226, 175, 0.15)',
              border: '1px solid rgba(255, 226, 175, 0.35)',
              color: '#FFE2AF',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '16px',
            }}
          >
            B2B2B Triple-Win Matrix
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
            Nilai Strategis Nyata untuk Setiap Stakeholder
          </h2>
          <p
            style={{
              fontSize: 'clamp(14px, 1.2vw, 17px)',
              color: 'rgba(255, 255, 255, 0.65)',
              maxWidth: '700px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Mengapa ekosistem ini bukan sekadar software langganan, melainkan infrastruktur penyelamat pembiayaan perbankan.
          </p>
        </div>

        {/* 3 Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '28px',
          }}
        >
          {cards.map((c) => {
            const IconComponent = c.icon;
            return (
              <div
                key={c.role}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '24px',
                  border: `1px solid ${c.border}`,
                  padding: '32px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        backgroundColor: c.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: c.color,
                      }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: c.color,
                        backgroundColor: c.bg,
                        padding: '4px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      {c.tag}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {c.role}
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px', marginBottom: '20px' }}>
                    {c.title}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {c.benefits.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                        <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
                          {b}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '28px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>Hasil Terukur</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: c.color }}>{c.impact}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
