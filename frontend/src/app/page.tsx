'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PrecisionSection from '@/components/PrecisionSection';
import DualDilemmaSection from '@/components/DualDilemmaSection';
import WorkflowStepsSection from '@/components/WorkflowStepsSection';
import AiPrecisionSection from '@/components/AiPrecisionSection';
import ValueMatrixSection from '@/components/ValueMatrixSection';
import InteractiveCtaSection from '@/components/InteractiveCtaSection';
import {
  Store,
  Building2,
  Smartphone,
  Terminal,
  ArrowRight,
  X,
  Sparkles,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export default function MeridianBentoLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setDemoModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const scrollToSection = (id: string) => {
    closeMenu();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="page">
      {/* ════════════════════════════════════════════════════════════════
          HERO VIEWPORT
          ════════════════════════════════════════════════════════════════ */}
      <section className="hero-viewport">
        {/* Background full-bleed looping painterly mountain video */}
        <div className="bg">
          <video
            className="bg-video"
            autoPlay
            muted
            loop
            playsInline
          >
            <source
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_075824_7c8a2ef3-826c-43ca-81a1-162429faa306.mp4"
              type="video/mp4"
            />
          </video>
          {/* Seamless bottom fade into Bento dark blue tone #0b2238 */}
          <div className="bg-gradient-fade" />
        </div>

        {/* Header / Nav */}
        <header className="nav">
          {/* Left — glass pill of links */}
          <nav className="nav__links" aria-label="Primary">
            <button
              type="button"
              onClick={() => scrollToSection('pillars')}
              className="nav__link"
              style={{ animationDelay: '0.02s' }}
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('solutions')}
              className="nav__link"
              style={{ animationDelay: '0.08s' }}
            >
              Solutions
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('company')}
              className="nav__link"
              style={{ animationDelay: '0.14s' }}
            >
              Company
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('pricing')}
              className="nav__link"
              style={{ animationDelay: '0.2s' }}
            >
              Pricing
            </button>
          </nav>

          {/* Center — logo from public/logo.png */}
          <Link className="logo flex items-center" href="/" aria-label="LANJUT × BNI AEGIS">
            <Image
              src="/logo.png"
              alt="LANJUT Logo"
              width={120}
              height={32}
              className="object-contain h-8 w-auto"
              priority
            />
          </Link>

          {/* Right — Login button (replaced Book Demo) & Mobile Burger */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="btn btn--nav cursor-pointer"
            >
              <span>Login</span>
              <span className="btn__icon">
                <svg viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10h10.2M10.4 5.6 15.2 10l-4.8 4.4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </div>

          {/* Mobile Burger */}
          <button
            className={`nav__burger ${menuOpen ? 'is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span />
            <span />
            <span />
          </button>
        </header>

        {/* Mobile Menu */}
        <div
          id="mobile-menu"
          className="mobile-menu"
          hidden={!menuOpen}
        >
          <div className="mobile-menu__links">
            <button
              type="button"
              className="mobile-menu__link text-left"
              onClick={() => scrollToSection('pillars')}
            >
              Platform (Architecture)
            </button>
            <button
              type="button"
              className="mobile-menu__link text-left"
              onClick={() => scrollToSection('solutions')}
            >
              Solutions & Modules
            </button>
            <button
              type="button"
              className="mobile-menu__link text-left"
              onClick={() => scrollToSection('company')}
            >
              Company & Ecosystem
            </button>
            <button
              type="button"
              className="mobile-menu__link text-left"
              onClick={() => scrollToSection('pricing')}
            >
              Pricing & Impact
            </button>
          </div>
          <Link
            href="/login"
            className="btn btn--nav w-full justify-center text-center"
          >
            <span>Login</span>
            <span className="btn__icon">
              <svg viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10h10.2M10.4 5.6 15.2 10l-4.8 4.4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        </div>

        {/* Hero Section */}
        <main className="hero">
          {/* Badge */}
          <button
            type="button"
            onClick={() => scrollToSection('pillars')}
            className="badge wipe cursor-pointer"
            style={{ '--d': '0.18s' } as React.CSSProperties}
          >
            <span className="badge__dot" />
            <span>LANJUT × BNI Ecosystem</span>
          </button>

          {/* Headline */}
          <h1 className="headline">
            <span className="headline__mask">
              <span
                className="headline__rise"
                style={{ '--d': '0.26s' } as React.CSSProperties}
              >
                Turning subscription churn into{' '}
                <span className="headline__accent">merchant retention & BNI intelligence.</span>
              </span>
            </span>
          </h1>

          {/* Actions */}
          <div className="hero__actions">
            {/* Tombol Utama: Get Started / Login */}
            <Link
              href="/login"
              className="btn btn--light wipe cursor-pointer"
              style={{ '--d': '0.56s' } as React.CSSProperties}
            >
              <span>Get Started</span>
              <span className="btn__icon">
                <svg viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10h10.2M10.4 5.6 15.2 10l-4.8 4.4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>

            {/* Tombol Kedua: Pelajari Cara Kerja */}
            <button
              type="button"
              onClick={() => scrollToSection('pillars')}
              className="btn btn--ghost wipe cursor-pointer"
              style={{ '--d': '0.66s' } as React.CSSProperties}
            >
              <span>Pelajari Cara Kerja</span>
            </button>
          </div>
        </main>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          INTERACTIVE DEMO SELECTOR MODAL
          ════════════════════════════════════════════════════════════════ */}
      {demoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDemoModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-[#0b2238] border border-[#24B1B1]/40 shadow-2xl p-6 sm:p-8 text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: 'radial-gradient(circle at top right, rgba(0, 121, 121, 0.25), transparent 70%)',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-[#FFE2AF] bg-[#007979]/40 border border-[#24B1B1]/30 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#24B1B1]" />
                Pilih Lingkungan Demo
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                Pilih Modul Interaktif LANJUT × BNI
              </h3>
              <p className="text-sm text-white/70 mt-1.5 leading-relaxed">
                Seluruh lingkungan terhubung langsung ke Core Backend (Port 5001) dan AI Inference Microservice (Port 8000).
              </p>
            </div>

            {/* 4 Demo Destination Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {/* Option 1: Merchant Portal */}
              <Link
                href="/merchant"
                onClick={() => setDemoModalOpen(false)}
                className="group p-4 rounded-xl bg-white/[0.04] hover:bg-[#007979]/20 border border-white/10 hover:border-[#24B1B1] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#24B1B1]/20 text-[#24B1B1] flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FFE2AF] bg-[#FFE2AF]/10 px-2 py-0.5 rounded">
                      Utama
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#24B1B1] transition-colors flex items-center gap-1.5">
                    Merchant AI Portal
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#24B1B1]" />
                  </h4>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    Pemindaian churn real-time, rekomendasi kuota dinamis, dan broadcast invite retensi instan.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#24B1B1]">
                  <span>Buka Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </Link>

              {/* Option 2: BNI Supervisor */}
              <Link
                href="/bni"
                onClick={() => setDemoModalOpen(false)}
                className="group p-4 rounded-xl bg-white/[0.04] hover:bg-[#007979]/20 border border-white/10 hover:border-[#24B1B1] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#007979]/20 text-[#007979] flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-[#24B1B1]" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Bank BNI
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#24B1B1] transition-colors flex items-center gap-1.5">
                    BNI Risk Supervisor
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#24B1B1]" />
                  </h4>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    Executive view Relationship Manager BNI untuk mitigasi NPL kredit UMKM dan monitoring arus kas.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#24B1B1]">
                  <span>Buka Executive View</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </Link>

              {/* Option 3: Member Portal */}
              <Link
                href="/member"
                onClick={() => setDemoModalOpen(false)}
                className="group p-4 rounded-xl bg-white/[0.04] hover:bg-[#007979]/20 border border-white/10 hover:border-[#24B1B1] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E37434]/20 text-[#E37434] flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E37434] bg-[#E37434]/10 px-2 py-0.5 rounded">
                      Member End-User
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#24B1B1] transition-colors flex items-center gap-1.5">
                    Member Renewal Portal
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#24B1B1]" />
                  </h4>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    Pengalaman pelanggan menerima smart invite dan penerbitan 1-click BNI Virtual Account SNAP.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#24B1B1]">
                  <span>Simulasi Checkout</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </Link>

              {/* Option 4: Technical Console */}
              <Link
                href="/demo"
                onClick={() => setDemoModalOpen(false)}
                className="group p-4 rounded-xl bg-white/[0.04] hover:bg-[#007979]/20 border border-white/10 hover:border-[#24B1B1] transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      Engine
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-[#24B1B1] transition-colors flex items-center gap-1.5">
                    Live Cluster Console
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#24B1B1]" />
                  </h4>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    Uji latensi pipeline antar microservices (Next.js ↔ Express ↔ FastAPI) secara real-time.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#24B1B1]">
                  <span>Uji Latensi & Telemetri</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              </Link>
            </div>

            {/* Quick Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#24B1B1]" />
                Didukung oleh Protokol SNAP BNI e-Collection
              </span>
              <Link
                href="/login"
                onClick={() => setDemoModalOpen(false)}
                className="inline-flex items-center gap-1.5 font-medium text-[#FFE2AF] hover:underline"
              >
                Masuk ke Portal Resmi →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          2. THE DUAL DILEMMA (Problem: Merchant Churn vs Bank NPL)
          ════════════════════════════════════════════════════════════════ */}
      <DualDilemmaSection />

      {/* ════════════════════════════════════════════════════════════════
          3. 4-STEP END-TO-END WORKFLOW (Alur Dina dari WA hingga BNI VA)
          ════════════════════════════════════════════════════════════════ */}
      <WorkflowStepsSection />

      {/* ════════════════════════════════════════════════════════════════
          4. AI VS DETERMINISTIC ENGINE (Precision Architecture)
          ════════════════════════════════════════════════════════════════ */}
      <AiPrecisionSection />

      {/* ════════════════════════════════════════════════════════════════
          5. PRECISION PILLARS (Staircase Architecture)
          ════════════════════════════════════════════════════════════════ */}
      <PrecisionSection />

      {/* ════════════════════════════════════════════════════════════════
          6. B2B2B VALUE MATRIX (Keuntungan Member, Merchant, Bank BNI)
          ════════════════════════════════════════════════════════════════ */}
      <ValueMatrixSection />

      {/* ════════════════════════════════════════════════════════════════
          7. FINAL INTERACTIVE CTA -> /demo
          ════════════════════════════════════════════════════════════════ */}
      <InteractiveCtaSection onOpenDemoModal={() => setDemoModalOpen(true)} />

      {/* ════════════════════════════════════════════════════════════════
          8. FOOTER
          ════════════════════════════════════════════════════════════════ */}
      <footer style={{ backgroundColor: '#071624', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px var(--pad-x)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }} className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs sm:text-sm text-white/40">
          <p>© 2026 LANJUT × Bank BNI Ecosystem. All rights reserved.</p>
          <div className="flex items-center gap-5 sm:gap-6 flex-wrap justify-center">
            <Link href="/demo" className="text-[#24B1B1] hover:underline">Interactive Demo Console</Link>
            <button type="button" onClick={() => scrollToSection('problem')} className="text-white/70 hover:text-white transition-colors">The Dilemma</button>
            <button type="button" onClick={() => scrollToSection('workflow')} className="text-white/70 hover:text-white transition-colors">Workflow</button>
            <button type="button" onClick={() => scrollToSection('architecture-precision')} className="text-white/70 hover:text-white transition-colors">AI Precision</button>
            <button type="button" onClick={() => scrollToSection('pillars')} className="text-white/70 hover:text-white transition-colors">Pillars</button>
            <button type="button" onClick={() => scrollToSection('value-matrix')} className="text-white/70 hover:text-white transition-colors">Value Matrix</button>
          </div>
        </div>
      </footer>
    </div>
  );
}