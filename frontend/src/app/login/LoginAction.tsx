'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, KeyRound, Lock, Loader2, Store, CreditCard, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { requestOtp, verifyOtp, type UserRole } from '@/lib/auth';
import { getDashboardPath } from '@/lib/dashboard-routes';
import styles from './page.module.css';

type LoginStep = 'email' | 'otp';

export default function LoginAction() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo1234');
  const [otp, setOtp] = useState('');
  const [detectedRole, setDetectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setIsError(true);
      setMessage('Masukkan alamat email yang valid.');
      return;
    }

    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const res = await requestOtp({ email, password });
      if (res?.role) {
        setDetectedRole(res.role);
      }
      if (res?.demo_otp) {
        setOtp(res.demo_otp);
      }
      setMessage(res?.message || 'Kode OTP 6 digit telah dikirim ke email kamu.');
      setStep('otp');
    } catch (err: unknown) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Gagal mengirim OTP. Periksa email & kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otp || otp.length < 6) {
      setIsError(true);
      setMessage('Masukkan 6 digit kode OTP.');
      return;
    }

    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const session = await verifyOtp({ email, otp, role: detectedRole || undefined });
      const targetRole = session.role === 'partner' ? 'payment_gateway' : 'merchant';
      const destination = getDashboardPath(targetRole) || '/merchant';
      setMessage('Verifikasi berhasil! Mengalihkan ke dashboard...');
      setTimeout(() => {
        router.replace(destination);
      }, 600);
    } catch (err: unknown) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Kode OTP salah atau kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demoEmail: string, role: UserRole) => {
    setEmail(demoEmail);
    setPassword('demo1234');
    setDetectedRole(role);
    setMessage('');
    setIsError(false);
  };

  return (
    <div className="w-full max-w-md mt-6 sm:mt-8">
      {/* Card Form */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,35,45,0.18)] border border-[#d4e6e4]">
        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <span className="text-xs font-bold uppercase tracking-wider text-[#007979]">
                Masuk dengan 2FA OTP
              </span>
              <span className="text-[11px] text-neutral-400">
                Auto-Role Detection
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Alamat Email Akun
              </label>
              <div className="flex items-center gap-2.5 bg-[#f7fbfa] rounded-xl border border-[#d4e6e4] px-3.5 py-3 focus-within:border-[#007979] focus-within:ring-2 focus-within:ring-[#007979]/20 transition-all">
                <Mail className="w-4 h-4 text-[#007979] flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@fitbody.id atau rm@bni.co.id"
                  className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="flex items-center gap-2.5 bg-[#f7fbfa] rounded-xl border border-[#d4e6e4] px-3.5 py-3 focus-within:border-[#007979] focus-within:ring-2 focus-within:ring-[#007979]/20 transition-all">
                <Lock className="w-4 h-4 text-[#007979] flex-shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
                  required
                />
              </div>
            </div>

            {/* Quick Demo Fill Buttons */}
            <div className="pt-1">
              <span className="text-[11px] font-medium text-neutral-500 block mb-1.5">
                Atau pilih kredensial demo:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => selectDemoAccount('owner@fitbody.id', 'merchant')}
                  className={`px-3 py-2 text-xs rounded-xl border text-left transition-all flex items-center gap-1.5 ${
                    email === 'owner@fitbody.id'
                      ? 'bg-[#007979]/10 border-[#007979] text-[#007979] font-bold'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 flex-shrink-0 text-orange-500" />
                  <span className="truncate">Merchant (FitBody)</span>
                </button>
                <button
                  type="button"
                  onClick={() => selectDemoAccount('rm@bni.co.id', 'partner')}
                  className={`px-3 py-2 text-xs rounded-xl border text-left transition-all flex items-center gap-1.5 ${
                    email === 'rm@bni.co.id'
                      ? 'bg-[#007979]/10 border-[#007979] text-[#007979] font-bold'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0 text-teal-600" />
                  <span className="truncate">BNI Partner / PG</span>
                </button>
              </div>
            </div>

            {message && (
              <div
                className={`text-xs p-3 rounded-xl border leading-relaxed ${
                  isError
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[#007979] hover:bg-[#005f5f] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#007979]/20 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Kode OTP…</span>
                </>
              ) : (
                <>
                  <span>Kirim Kode OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setMessage('');
                  setIsError(false);
                }}
                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 transition-colors font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ganti email</span>
              </button>
              {detectedRole && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#007979]/10 text-[#007979] uppercase">
                  {detectedRole === 'partner' ? 'Payment Gateway / BNI' : 'Merchant'}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Kode Verifikasi OTP (6 digit)
                </label>
                <span className="text-[11px] text-neutral-400">Berlaku 5 menit</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#f7fbfa] rounded-xl border border-[#d4e6e4] px-3.5 py-3 focus-within:border-[#007979] focus-within:ring-2 focus-within:ring-[#007979]/20 transition-all">
                <KeyRound className="w-4 h-4 text-[#007979] flex-shrink-0" />
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full bg-transparent text-base tracking-[0.3em] font-mono text-neutral-900 placeholder:text-neutral-400 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                Kode dikirim ke <span className="font-semibold text-neutral-800">{email}</span>
              </p>
            </div>

            {message && (
              <div
                className={`text-xs p-3 rounded-xl border leading-relaxed ${
                  isError
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full h-12 rounded-xl bg-[#007979] hover:bg-[#005f5f] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#007979]/20 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verifikasi &amp; Buka Dashboard</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Security badge footer */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#007979]" />
            2FA OTP via Mailjet &amp; BNI e-Collection
          </span>
          <span className="text-[10px] text-neutral-400">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
