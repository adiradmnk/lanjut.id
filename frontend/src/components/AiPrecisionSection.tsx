'use client';

import React from 'react';
import { Cpu, Check, X, Shield, Zap, Database, Server } from 'lucide-react';

export default function AiPrecisionSection() {
  return (
    <section
      id="architecture-precision"
      style={{
        backgroundColor: '#0b2238',
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
              backgroundColor: 'rgba(0, 121, 121, 0.25)',
              border: '1px solid rgba(36, 177, 177, 0.4)',
              color: '#24B1B1',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '16px',
            }}
          >
            <Cpu size={14} />
            Precision Architecture
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.8vw, 44px)',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 auto 16px',
              maxWidth: '840px',
            }}
          >
            AI Fleksibel untuk Bahasa Manusia. Komputer Tegas untuk Angka & Finansial.
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
            Banyak yang keliru mengira AI mengerjakan seluruh sistem. LANJUT membatasi peran AI secara sangat spesifik agar cepat, hemat token, dan bebas halusinasi keuangan.
          </p>
        </div>

        {/* 2-Side Comparison Box */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
          }}
        >
          {/* Sisi Kiri: Apa yang Dikerjakan AI */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '24px',
              border: '1px solid rgba(36, 177, 177, 0.35)',
              padding: 'clamp(24px, 3vw, 36px)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(36, 177, 177, 0.15)',
                color: '#24B1B1',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}
            >
              <Zap size={13} />
              Peran Spesifik AI (gpt-4o-mini / Gemini)
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>
              Penerjemah Bahasa Manusia ke JSON Terstruktur
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, marginBottom: '24px' }}>
              Teks keluhan pelanggan bersifat tidak beraturan (*unstructured data*). AI bertugas memahami konteks percakapan dan menghasilkan parameter bersih untuk database:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(36, 177, 177, 0.2)', color: '#24B1B1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>Mengekstrak Akar Masalah</strong>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0' }}>Mengelompokkan keluhan ke intent: SCHEDULE_CONFLICT, PRICE_SENSITIVE, atau MEDICAL_PAUSE.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(36, 177, 177, 0.2)', color: '#24B1B1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>Identifikasi Preferensi Waktu</strong>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0' }}>Mendeteksi preferensi jadwal baru (contoh: malam hari di atas jam 18:00 WIB).</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(36, 177, 177, 0.2)', color: '#24B1B1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>Skor Risiko Churn & Sentimen</strong>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0' }}>Menghitung tingkat urgensi (0.88) agar sistem segera mengeksekusi penawaran penyelamatan.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Apa yang Dikerjakan Komputer Biasa */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 226, 175, 0.35)',
              padding: 'clamp(24px, 3vw, 36px)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 226, 175, 0.15)',
                color: '#FFE2AF',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}
            >
              <Database size={13} />
              Peran Komputer & SQL (Bukan AI)
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF', marginBottom: '12px' }}>
              Validasi Deterministik & Kepastian Finansial BNI
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, marginBottom: '24px' }}>
              Semua aturan bisnis, sisa kuota, dan transaksi uang dieksekusi oleh kode deterministik (Node.js & PostgreSQL) tanpa kemungkinan halusinasi:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(255, 226, 175, 0.2)', color: '#FFE2AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>Scanning Absensi & Kuota Sesi</strong>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0' }}>Query relasional menghitung rasio kehadiran (2/8) dan sisa 7 hari masa aktif.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(255, 226, 175, 0.2)', color: '#FFE2AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>Margin Protection & Cek Kursi</strong>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0' }}>Memastikan kelas malam memiliki kursi kosong & batas diskon tidak melebihi batas merchant (15%).</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(255, 226, 175, 0.2)', color: '#FFE2AF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Check size={12} strokeWidth={3} />
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>Penerbitan BNI Virtual Account</strong>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '2px 0 0' }}>Mengirim request ke API BNI untuk mencetak nomor tagihan 988... dengan verifikasi webhook aman.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
