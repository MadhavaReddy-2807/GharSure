"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { maskPhone, normalizeIndianPhone } from "@/lib/phone";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [mockHint, setMockHint] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const rawPhone =
      searchParams.get("phone") ||
      (typeof window !== "undefined" ? sessionStorage.getItem("gharsure_auth_phone") : null);

    const normalized = rawPhone ? normalizeIndianPhone(rawPhone) : null;
    if (!normalized) {
      router.replace("/auth");
      return;
    }

    setPhone(normalized);
    setIsReady(true);

    const devOtp = sessionStorage.getItem("gharsure_dev_mock_otp");
    if (devOtp) {
      setMockHint(devOtp);
    }
  }, [searchParams, router]);

  // Resend countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input once ready
  useEffect(() => {
    if (isReady) {
      inputRefs.current[0]?.focus();
    }
  }, [isReady]);

  const handleDigitChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, "");
    if (errorMessage) setErrorMessage(null);

    if (digitsOnly.length <= 1) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = digitsOnly;
      setOtpDigits(nextDigits);

      if (digitsOnly && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      if (digitsOnly && index === 5) {
        const fullOtp = nextDigits.join("");
        if (fullOtp.length === 6) {
          triggerVerification(fullOtp);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const nextDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i];
    }
    setOtpDigits(nextDigits);

    if (pasteData.length === 6) {
      inputRefs.current[5]?.focus();
      triggerVerification(pasteData);
    } else {
      inputRefs.current[Math.min(pasteData.length, 5)]?.focus();
    }
  };

  const triggerVerification = async (candidateOtp?: string) => {
    const code = candidateOtp || otpDigits.join("");
    if (code.length !== 6 || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Verification failed. Please check the code.");
        setIsLoading(false);
        return;
      }

      sessionStorage.removeItem("gharsure_dev_mock_otp");
      router.replace(data.nextStep || "/home");
    } catch {
      setErrorMessage("Network connection error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Could not resend OTP. Please try again.");
        setIsResending(false);
        return;
      }

      setCooldown(data.cooldownSeconds || 60);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

      if (data.devMockOtp) {
        setMockHint(data.devMockOtp);
      }
    } catch {
      setErrorMessage("Network error. Could not resend code.");
    } finally {
      setIsResending(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
      </div>
    );
  }

  const isComplete = otpDigits.every((d) => d.length === 1);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold text-brand-navy tracking-tight">
            Ghar<span className="text-brand-orange">Sure</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Household Intelligence</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-navy transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change number</span>
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold text-brand-navy">Verify WhatsApp Code</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sent 6-digit code to <span className="font-semibold text-slate-800">{maskPhone(phone)}</span>
            </p>
          </div>

          {mockHint && (
            <div className="mb-4 p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-xs text-brand-orange flex items-center justify-between">
              <span>Dev Mock Mode</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-orange-300">
                {mockHint}
              </span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="flex justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isLoading}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono text-brand-navy bg-white border border-slate-300 rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 focus:outline-none transition-all disabled:opacity-50"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full text-sm font-semibold"
              onClick={() => triggerVerification()}
              isLoading={isLoading}
              disabled={!isComplete || isLoading}
            >
              Verify OTP
            </Button>

            <div className="text-center pt-2">
              {cooldown > 0 ? (
                <span className="text-xs text-slate-400">
                  Resend code in {cooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-xs font-semibold text-brand-orange hover:underline focus:outline-none"
                >
                  {isResending ? "Resending..." : "Resend code via WhatsApp"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
