'use client';

import React from 'react';
import { AlertOctagon, TrendingDown, EyeOff, ShieldAlert, ArrowRight } from 'lucide-react';

export default function DualDilemmaSection() {
  return (
    <section
      id="problem"
      style={{
        backgroundColor: '#0b2238',
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
              backgroundColor: 'rgba(227, 116, 52, 0.15)',
              border: '1px solid rgba(227, 116, 52, 0.35)',
              color: '#FFE2AF',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '16px',
            }}
          >
            <AlertOctagon size={14} color="#E37434" />
            The Dual Dilemma
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
            Jurang Kritis: Di Mana Bisnis Langganan & Bank BNI Kehilangan Nilai
          </h2>
          <p
            style={{
              fontSize: 'clamp(14px, 1.2vw, 17px)',
              color: 'rgba(255, 255, 255, 0.65)',
              maxWidth: '680px',
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Bisnis jasa langganan tidak kehilangan pelanggan dalam semalam. Begitu pula bank, NPL tidak muncul mendadak tanpa sinyal operasional sebelumnya.
          </p>
        </div>

        {/* 2 Comparison Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
          }}
        >
          {/* Card 1: Sisi Merchant UMKM */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '24px',
              border: '1px solid rgba(227, 116, 52, 0.3)',
              padding: 'clamp(24px, 3vw, 36px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '160px',
                height: '160px',
                background: 'radial-gradient(circle, rgba(227, 116, 52, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(227, 116, 52, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#E37434',
                  }}
                >
                  <TrendingDown size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#E37434', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sisi Merchant UMKM (Gym, Klinik, Studio)
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>Silent Churn & Jadwal Kaku</h3>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, marginBottom: '20px' }}>
                Pelanggan tidak langsung membatalkan keanggotaan. Mereka mulai absen berturut-turut karena jadwal bentrok (misal: mulai WFO kantor jam 08.00 pagi). Merchant tidak punya tim CS yang bisa memantau dan mengajak ngobrol setiap member yang hampir berhenti secara personal.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  <span style={{ color: '#E37434', fontWeight: 700 }}>✕</span>
                  <span><strong>80% Churn</strong> berakar dari jadwal yang tidak fleksibel, bukan ketidaksukaan produk.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  <span style={{ color: '#E37434', fontWeight: 700 }}>✕</span>
                  <span>Merchant baru sadar saat perpanjangan gagal dan uang langganan sudah hangus.</span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '28px',
                paddingTop: '18px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#FFE2AF',
              }}
            >
              <span>Dampak Finansial:</span>
              <span style={{ fontWeight: 700, color: '#E37434' }}>Kehilangan Rp 350.000 - Rp 1.500.000 / member</span>
            </div>
          </div>

          {/* Card 2: Sisi Bank BNI */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '24px',
              border: '1px solid rgba(36, 177, 177, 0.3)',
              padding: 'clamp(24px, 3vw, 36px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '160px',
                height: '160px',
                background: 'radial-gradient(circle, rgba(36, 177, 177, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(36, 177, 177, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#24B1B1',
                  }}
                >
                  <EyeOff size={20} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#24B1B1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sisi Bank BNI (Relationship Manager / Kredit SME)
                  </span>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>Blindspot Mutasi & Risiko NPL</h3>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, marginBottom: '20px' }}>
                Bank biasanya hanya memantau mutasi saldo rekening (*lagging indicator*). Ketika arus kas merchant anjlok atau cicilan kredit mulai tertunggak, intervensi RM sudah terlambat. Bank tidak punya visibilitas terhadap denyut harian keaktifan member merchant binaan (*leading indicator*).
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  <span style={{ color: '#24B1B1', fontWeight: 700 }}>✕</span>
                  <span><strong>Mutasi rekening terlambat 30-60 hari</strong> untuk mendeteksi kebangkrutan usaha nasabah.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  <span style={{ color: '#24B1B1', fontWeight: 700 }}>✕</span>
                  <span>RM BNI kesulitan memprioritaskan merchant mana yang butuh pendampingan proaktif.</span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '28px',
                paddingTop: '18px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#FFE2AF',
              }}
            >
              <span>Risiko Perbankan:</span>
              <span style={{ fontWeight: 700, color: '#24B1B1' }}>Potensi Kredit Macet (NPL) Ratusan Juta</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
