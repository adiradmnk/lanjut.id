'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { requestOtp, verifyOtp, UserRole } from '@/lib/auth';

interface LoginFormProps {
  role: UserRole;
  title: string;
  subtitle: string;
  accentColor: string; // tailwind class prefix, e.g. 'orange-500' or '[#005E6A]'
  badge: string;
  redirectTo: string;
  demoEmail: string;
}

type Step = 'credentials' | 'otp';

export default function LoginForm({
  role,
  title,
  subtitle,
  badge,
  redirectTo,
  demoEmail,
}: LoginFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestOtp({ email, password, role });
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.length < 6) {
      setError('Masukkan 6 digit kode OTP dari email kamu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyOtp({ email, otp, role });
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal verifikasi OTP. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail(demoEmail);
    setPassword('demo1234');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f3f4f6] px-4 py-10">
      <div className="w-full max-w-[960px] bg-white rounded-[28px] shadow-[0_2px_18px_rgba(0,0,0,0.06)] border border-neutral-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left brand panel */}
        <div className={`hidden md:flex flex-col justify-between p-10 bg-neutral-950 text-white relative overflow-hidden`}>
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                <span className="text-orange-500">L</span>
              </div>
              <span className="text-lg font-black tracking-tight">lanjut</span>
            </Link>

            <div className={`inline-flex items-center gap-1.5 mt-10 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wide text-white/80`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{badge}</span>
            </div>
            <h1 className="text-2xl font-bold mt-4 leading-snug">{title}</h1>
            <p className="text-sm text-white/60 mt-3 leading-relaxed">{subtitle}</p>
          </div>

          <div className="text-[11px] text-white/40">
            &copy; {new Date().getFullYear()} lanjut &mdash; Revenue Recovery & Capacity Engine
          </div>
        </div>

        {/* Right form panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center text-white font-bold text-sm">
              <span className="text-orange-500">L</span>
            </div>
            <span className="text-lg font-black tracking-tight text-neutral-900">lanjut</span>
          </div>

          {step === 'credentials' ? (
            <>
              <h2 className="text-xl font-bold text-neutral-900">Masuk ke akun Anda</h2>
              <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>

              <form onSubmit={handleCredentialsSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Email</label>
                  <div className="flex items-center gap-2 bg-[#fafafa] rounded-xl border border-neutral-200/90 px-3 py-2.5 focus-within:border-neutral-400 transition-colors">
                    <Mail className="w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@perusahaan.com"
                      autoComplete="email"
                      className="flex-1 text-sm text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Kata Sandi</label>
                  <div className="flex items-center gap-2 bg-[#fafafa] rounded-xl border border-neutral-200/90 px-3 py-2.5 focus-within:border-neutral-400 transition-colors">
                    <Lock className="w-4 h-4 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="flex-1 text-sm text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-neutral-400 hover:text-neutral-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Kirim Kode OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={fillDemo}
                  className="w-full h-10 rounded-xl bg-[#fafafa] hover:bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-semibold transition-colors"
                >
                  Isi kredensial demo
                </button>
              </form>

              <p className="text-[11px] text-neutral-400 mt-6 text-center">
                Setelah email &amp; kata sandi benar, kode OTP dikirim ke email kamu (berlaku 5 menit).
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-neutral-900">Masukkan Kode OTP</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Kode 6 digit sudah dikirim ke <span className="font-semibold">{email}</span>, berlaku 5 menit.
              </p>

              <form onSubmit={handleOtpSubmit} className="mt-7 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Kode OTP</label>
                  <div className="flex items-center gap-2 bg-[#fafafa] rounded-xl border border-neutral-200/90 px-3 py-2.5 focus-within:border-neutral-400 transition-colors">
                    <KeyRound className="w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      className="flex-1 text-sm text-neutral-800 placeholder:text-neutral-400 bg-transparent outline-none tracking-[0.3em]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verifikasi & Masuk</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setOtp('');
                    setError(null);
                  }}
                  className="w-full h-10 rounded-xl bg-[#fafafa] hover:bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-semibold transition-colors"
                >
                  Kembali, ganti email/kata sandi
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
