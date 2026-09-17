"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const termsText = (
  <>
    By creating an account, you agree to our{" "}
    <a
      href="#"
      className="font-medium text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
    >
      Terms and Services
    </a>{" "}
    and{" "}
    <a
      href="#"
      className="font-medium text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors"
    >
      Privacy Policy
    </a>
  </>
);

export default function LoginPage() {
  return (
    <section className="min-h-screen bg-black p-4 lg:p-6 text-white antialiased [font-synthesis:none]">
      <div className="grid min-h-[calc(100vh-3rem)] gap-6 lg:grid-cols-2 max-w-[1600px] mx-auto">
        {/* Left Section - Video Box with rounded corners and padding */}
        <div className="relative flex min-h-[600px] justify-center overflow-hidden rounded-[32px] bg-[#0a0a0a]">
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-80"
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
          
          <div className="relative z-10 flex w-full flex-col items-center pt-16 px-8 justify-start">
            <h2 className="text-3xl font-semibold mb-3 tracking-wide bg-gradient-to-br from-orange-200 via-orange-300 to-blue-200 bg-clip-text text-transparent drop-shadow-md">
              Lanjut.id
            </h2>
            <p className="text-center text-xl sm:text-2xl leading-snug font-medium drop-shadow-md max-w-[400px] text-orange-100/90">
              Transform subscription churn into lasting merchant retention & BNI intelligence.
            </p>
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "email") {
      if (email) setStep("otp");
    } else {
      if (otp) {
        // Redirect to merchant dashboard after "login"
        router.push("/merchant");
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-[420px] text-center">
      <h1 className="whitespace-nowrap text-3xl font-medium tracking-tight sm:text-4xl lg:text-[42px] mb-10">
        {step === "email" ? "Create an account" : "Enter OTP"}
      </h1>

      {step === "otp" && (
        <p className="mt-4 mb-8 text-white/60">
          We have sent a one-time password to <span className="font-semibold text-white">{email}</span>.
        </p>
      )}

      <form className="space-y-6 text-left" onSubmit={handleSubmit}>
        {step === "email" ? (
          <FieldBox label="Email" value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
        ) : (
          <FieldBox label="OTP Code" value={otp} onChange={setOtp} type="text" placeholder="Enter 6-digit code" />
        )}

        {step === "email" && (
          <div className="space-y-3 pt-2 text-xs leading-5 text-white/40">
            <CheckboxLine>{termsText}</CheckboxLine>
          </div>
        )}

        <button
          type="submit"
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-xl bg-white text-base font-semibold text-black transition-colors hover:bg-white/90"
        >
          {step === "email" ? "Continue with Email" : "Verify & Login"}
        </button>
        
        {step === "otp" && (
          <button
            type="button"
            onClick={() => setStep("email")}
            className="mt-4 text-sm text-center w-full text-white/50 hover:text-white transition-colors"
          >
            Wrong email? Go back
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
    <label className="flex h-[52px] items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 text-base leading-none focus-within:border-white/30 focus-within:bg-white/10 transition-colors">
      <input
        type={type}
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 truncate bg-transparent text-white outline-none placeholder:text-white/30"
      />
    </label>
  );
}

function CheckboxLine({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <span className="relative mt-[2px] size-[14px] shrink-0">
        <input
          type="checkbox"
          className="peer size-full appearance-none rounded-[3px] border border-white/20 bg-white/5 checked:border-white checked:bg-white transition-colors cursor-pointer"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-0 hidden size-full p-[2px] text-black peer-checked:block"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 6.2 5 8.1 9 3.9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}
