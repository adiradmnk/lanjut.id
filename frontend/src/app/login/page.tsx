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
    <div className="mx-auto w-full max-w-[500px] text-center">
      <h1 className="whitespace-nowrap text-3xl font-medium tracking-[-0.04em] sm:text-4xl lg:text-[42px] lg:leading-[1.05]">
        {step === "email" ? "Create an account" : "Enter OTP"}
      </h1>

      {step === "email" && (
        <div className="mb-8" />
      )}

      {step === "otp" && (
        <p className="mt-4 mb-8 text-black/60 dark:text-white/60">
          We have sent a one-time password to <span className="font-semibold text-black dark:text-white">{email}</span>.
        </p>
      )}

      <form className="space-y-5 text-left" onSubmit={handleSubmit}>
        {step === "email" ? (
          <FieldBox label="Email" value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
        ) : (
          <FieldBox label="OTP Code" value={otp} onChange={setOtp} type="text" placeholder="Enter 6-digit code" />
        )}

        {step === "email" && (
          <div className="space-y-3 pt-2 text-xs leading-4 text-black/30 dark:text-white/35 sm:text-[13px]">
            <CheckboxLine>{termsText}</CheckboxLine>
          </div>
        )}

        <button
          type="submit"
          className="mt-9 flex h-12 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-lg font-medium text-white transition-colors hover:bg-black/85 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85"
        >
          {step === "email" ? "Continue with Email" : "Verify & Login"}
        </button>
        
        {step === "otp" && (
          <button
            type="button"
            onClick={() => setStep("email")}
            className="mt-4 text-sm text-center w-full text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors"
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


