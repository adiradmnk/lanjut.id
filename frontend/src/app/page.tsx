'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function MeridianBentoLandingPage() {
  return (
    <div className="relative w-full h-screen h-[100dvh] overflow-hidden bg-white select-none">
      {/* Background full-bleed looping painterly mountain video */}
      <div className="absolute inset-0 z-0 bg-white pointer-events-none overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
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
      </div>

      {/* Top Header: Logo on left, Login on right */}
      <header className="relative z-10 w-full px-6 sm:px-12 lg:px-16 pt-8 sm:pt-10 flex items-center justify-between">
        {/* Brand Logo - Enlarged and Crisp */}
        <Link href="/" className="flex items-center transition-transform hover:scale-105">
          <Image
            src="/logo.png"
            alt="Lanjut.id Logo"
            width={180}
            height={56}
            className="h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-sm"
            priority
          />
        </Link>

        {/* Login Button at top-right */}
        <Link
          href="/login"
          className="btn btn--nav cursor-pointer shadow-md hover:shadow-lg transition-all"
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
      </header>

      {/* Hero Content Section: Perfectly positioned fit-to-page */}
      <main className="relative z-10 px-6 sm:px-12 lg:px-16 max-w-4xl pt-10 sm:pt-14 lg:pt-20 flex flex-col items-start text-left">
        {/* Badge: LANJUT × BNI Ecosystem */}
        <div
          className="badge wipe inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-sm bg-white/45 border border-[#007979]/30 backdrop-blur-md text-neutral-900 text-xs sm:text-sm font-semibold tracking-tight shadow-xs"
          style={{ '--d': '0.18s' } as React.CSSProperties}
        >
          <span className="w-3 h-3 bg-white border-2 border-[#007979] inline-block shrink-0" />
          <span>LANJUT × BNI Ecosystem</span>
        </div>

        {/* Headline */}
        <h1 className="headline mt-4 sm:mt-6 text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.14] text-neutral-950">
          <span className="headline__mask block overflow-hidden">
            <span
              className="headline__rise inline-block"
              style={{ '--d': '0.26s' } as React.CSSProperties}
            >
              Turning subscription churn into{' '}
              <span className="text-[#007979] font-semibold">
                merchant retention & BNI intelligence.
              </span>
            </span>
          </span>
        </h1>

        {/* Actions Buttons */}
        <div className="hero__actions mt-6 sm:mt-8 flex items-center gap-3.5 flex-wrap">
          <Link
            href="/login"
            className="btn btn--light wipe cursor-pointer shadow-sm hover:shadow-md transition-all"
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

          <Link
            href="/demo"
            className="btn btn--ghost wipe cursor-pointer shadow-xs hover:bg-white/70 transition-all text-sm font-medium"
            style={{ '--d': '0.66s' } as React.CSSProperties}
          >
            <span>Pelajari Cara Kerja</span>
          </Link>
        </div>
      </main>
    </div>
  );
}