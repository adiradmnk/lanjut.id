'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Smartphone, Store, Building2, ShieldCheck } from 'lucide-react';

interface InteractiveCtaSectionProps {
  onOpenDemoModal?: () => void;
}

export default function InteractiveCtaSection({ onOpenDemoModal }: InteractiveCtaSectionProps) {
  return (
    <section
      id="cta"
      style={{
        backgroundColor: '#071624',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: 'clamp(56px, 8vw, 96px) clamp(20px, 4vw, 64px)',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0, 121, 121, 0.4) 0%, rgba(11, 34, 56, 0.8) 50%, rgba(227, 116, 52, 0.25) 100%)',
            border: '1px solid rgba(36, 177, 177, 0.45)',
            borderRadius: '32px',
            padding: 'clamp(36px, 6vw, 64px) clamp(24px, 5vw, 56px)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle glow circle */}
          <div
            style={{
              position: 'absolute',
              top: '-40%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(36, 177, 177, 0.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFE2AF',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '20px',
            }}
          >
            <Sparkles size={14} color="#24B1B1" />
            Live Interactive Hackathon Console
          </div>

          <h2
            style={{
              fontSize: 'clamp(28px, 4.2vw, 48px)',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              lineHeight: 1.18,
              margin: '0 auto 16px',
              maxWidth: '820px',
            }}
          >
            Uji Langsung Ekosistem LANJUT dalam 3 Skenario Peran
          </h2>

          <p
            style={{
              fontSize: 'clamp(14px, 1.25vw, 18px)',
              color: 'rgba(255, 255, 255, 0.75)',
              maxWidth: '680px',
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}
          >
            Mulai dari simulasi HP Dina (WhatsApp + AI NLU), Dashboard Pemilik Studio, hingga Early Warning Radar Relationship Manager BNI.
          </p>

          {/* 3 Role Quick Badges */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '36px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', color: '#24B1B1' }}>
              <Smartphone size={14} />
              <span>1. Member HP Mockup</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', color: '#FFE2AF' }}>
              <Store size={14} />
              <span>2. Merchant Studio Dashboard</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', color: '#E37434' }}>
              <Building2 size={14} />
              <span>3. BNI RM NPL Console</span>
            </div>
          </div>

          {/* Call to action button */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 36px',
                borderRadius: '40px',
                backgroundColor: '#24B1B1',
                color: '#071624',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 12px 30px rgba(36, 177, 177, 0.4)',
                transition: 'transform 0.2s, background 0.2s',
              }}
            >
              <span>Buka Live Demo Console</span>
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Compliance statement */}
          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            <ShieldCheck size={16} color="#24B1B1" />
            <span>Kepatuhan Penuh UU Perlindungan Data Pribadi (UU PDP) & Standar Keamanan Perbankan BNI</span>
          </div>
        </div>
      </div>
    </section>
  );
}
