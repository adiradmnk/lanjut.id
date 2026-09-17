"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const termsText = (
  <>
    By creating an account, you agree to our{" "}
    <a
      href="#"
      className="font-medium text-black/45 underline underline-offset-2 dark:text-white/45"
    >
      Terms and Services
    </a>{" "}
    and{" "}
    <a
      href="#"
      className="font-medium text-black/45 underline underline-offset-2 dark:text-white/45"
    >
      Privacy Policy
    </a>
  </>
);

export default function LoginPage() {
  return (
    <section className="min-h-screen bg-white p-3 text-black antialiased [font-synthesis:none] dark:bg-[#050505] dark:text-white">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="relative flex min-h-[760px] justify-center overflow-hidden rounded-md bg-black px-7 py-12 text-white sm:px-10 lg:min-h-0 lg:py-20 xl:py-24">
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-60"
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
          
          <div className="relative z-10 flex w-full max-w-[500px] flex-col items-center">
            <div className="flex items-center gap-3 text-2xl font-bold text-white">
              Lanjut.id
            </div>

            <p className="mt-auto max-w-[320px] text-center text-2xl leading-tight text-white drop-shadow-lg font-medium">
              Turning subscription churn into merchant retention & BNI intelligence.
            </p>
          </div>
        </div>

        <div className="flex min-h-[760px] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-0 lg:px-14 xl:px-20">
          <AuthForm />
        </div>
      </div>
    </section>
  );
}

function AuthForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (step === "email") {
      if (!cleanEmail) return;
      setLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Gagal mengirim OTP. Silakan coba lagi.");
        }

        if (data?.demo_otp) {
          setDemoOtpHint(data.demo_otp);
          setOtp(data.demo_otp);
        } else {
          setDemoOtpHint(null);
        }
        setStep("otp");
      } catch (err: any) {
        // Fallback demo for offline/disconnected environment
        if (cleanEmail === "merchant@lanjut.id" || cleanEmail === "partner@lanjut.id") {
          setDemoOtpHint("123456");
          setOtp("123456");
          setStep("otp");
        } else {
          setError(err?.message || "Terjadi kesalahan. Silakan coba lagi.");
        }
      } finally {
        setLoading(false);
      }
    } else {
      if (!otp.trim()) return;
      setLoading(true);
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, otp: otp.trim() }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          // If offline/demo fallback
          if (cleanEmail === "partner@lanjut.id") {
            router.push("/payment-gateway");
            return;
          } else if (cleanEmail === "merchant@lanjut.id") {
            router.push("/merchant");
            return;
          }
          throw new Error(data?.message || "Kode OTP salah atau kedaluwarsa.");
        }

        // Save session if available
        if (typeof window !== "undefined" && data?.token) {
          const role = (data.role as "merchant" | "partner") || (cleanEmail === "partner@lanjut.id" ? "partner" : "merchant");
          localStorage.setItem(
            "lanjut_session",
            JSON.stringify({
              role,
              email: cleanEmail,
              name: data.name || cleanEmail.split("@")[0],
              token: data.token,
              tenant_id: data.tenant_id,
            })
          );
        }

        // Route accordingly
        if (data?.redirect_url) {
          router.push(data.redirect_url);
        } else if (data?.role === "partner" || cleanEmail === "partner@lanjut.id") {
          router.push("/payment-gateway");
        } else {
          router.push("/merchant");
        }
      } catch (err: any) {
        if (cleanEmail === "partner@lanjut.id") {
          router.push("/payment-gateway");
        } else if (cleanEmail === "merchant@lanjut.id") {
          router.push("/merchant");
        } else {
          setError(err?.message || "Verifikasi OTP gagal.");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-[500px] text-center">
      <h1 className="whitespace-nowrap text-3xl font-medium tracking-[-0.04em] sm:text-4xl lg:text-[42px] lg:leading-[1.05]">
        {step === "email" ? "Masuk ke Lanjut.id" : "Masukkan Kode OTP"}
      </h1>

      {step === "email" ? (
        <div className="mt-3 mb-6">
          <p className="text-xs text-neutral-500">
            Pilih demo akun:{" "}
            <button
              type="button"
              onClick={() => setEmail("merchant@lanjut.id")}
              className="font-medium text-orange-500 hover:underline mx-1 cursor-pointer"
            >
              merchant@lanjut.id
            </button>{" "}
            |{" "}
            <button
              type="button"
              onClick={() => setEmail("partner@lanjut.id")}
              className="font-medium text-cyan-500 hover:underline mx-1 cursor-pointer"
            >
              partner@lanjut.id
            </button>
          </p>
        </div>
      ) : (
        <div className="mt-4 mb-6 text-black/60 dark:text-white/60">
          <p className="text-sm">
            Kode OTP telah dikirim ke <span className="font-semibold text-black dark:text-white">{email}</span>.
          </p>
          {demoOtpHint && (
            <div className="mt-3 inline-block rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-mono text-orange-400">
              Demo OTP: <strong className="font-bold tracking-widest">{demoOtpHint}</strong>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 text-left">
          {error}
        </div>
      )}

      <form className="space-y-5 text-left" onSubmit={handleSubmit}>
        {step === "email" ? (
          <FieldBox label="Email" value={email} onChange={setEmail} type="email" placeholder="merchant@lanjut.id" />
        ) : (
          <FieldBox label="Kode OTP" value={otp} onChange={setOtp} type="text" placeholder="Masukkan 6-digit kode OTP" />
        )}

        {step === "email" && (
          <div className="space-y-3 pt-2 text-xs leading-4 text-black/30 dark:text-white/35 sm:text-[13px]">
            <CheckboxLine>{termsText}</CheckboxLine>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-9 flex h-12 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-lg font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-50 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85 cursor-pointer"
        >
          {loading ? "Memproses..." : step === "email" ? "Lanjutkan dengan Email" : "Verifikasi & Masuk"}
        </button>
        
        {step === "otp" && (
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            className="mt-4 text-sm text-center w-full text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors cursor-pointer"
          >
            Salah email? Kembali
          </button>
        )}
      </form>
    </div>
  );
}


function FieldBox({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex h-11 items-center justify-between gap-4 rounded-[8px] border border-black/20 bg-white px-4 text-base leading-none dark:border-white/15 dark:bg-white/5">
      <input
        type={type}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 truncate bg-transparent text-black outline-none placeholder:text-black/35 dark:text-white dark:placeholder:text-white/35"
      />
    </label>
  );
}

function CheckboxLine({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-start gap-3">
      <span className="relative mt-0.5 size-3 shrink-0">
        <input
          type="checkbox"
          className="peer size-full appearance-none rounded-[2px] border border-black/25 bg-white checked:border-black checked:bg-black dark:border-white/30 dark:bg-white/5 dark:checked:border-white dark:checked:bg-white"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-0 hidden size-full p-px text-white peer-checked:block dark:text-black"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 6.2 5 8.1 9 3.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}


