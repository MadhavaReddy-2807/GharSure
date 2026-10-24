"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
      setErrorMessage("Connection error. Please try again.");
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
        setErrorMessage(data.error || "Could not resend code. Please try again.");
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  const isComplete = otpDigits.every((d) => d.length === 1);

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Header / Brand */}
      <div className="max-w-sm mx-auto w-full pt-4 sm:pt-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/auth"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change number</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 font-mono tracking-tight">{maskPhone(phone)}</span>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Enter verification code
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              We sent a 6-digit passcode to WhatsApp at{" "}
              <span className="text-slate-800 font-semibold">{maskPhone(phone)}</span>.
            </p>
          </div>

          {mockHint && (
            <div className="mb-4 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-brand-orange flex items-center justify-between">
              <span className="font-medium text-[11px]">Dev Mock Code</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-orange-200">
                {mockHint}
              </span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-5">
            <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
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
                  className="w-10 h-12 sm:w-11 sm:h-12 text-center text-xl font-bold font-mono text-slate-900 bg-white border border-slate-200 rounded-xl hover:border-slate-300 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 focus:outline-none transition-all shadow-xs disabled:opacity-50"
                  aria-label={`Digit ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => triggerVerification()}
              disabled={!isComplete || isLoading}
              className="w-full h-11 rounded-xl bg-brand-purple hover:bg-brand-purple/90 active:bg-brand-purple-600 disabled:opacity-40 text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Confirm & Continue</span>
              )}
            </button>

            <div className="text-center pt-1">
              {cooldown > 0 ? (
                <span className="text-xs text-slate-400 font-medium">
                  Resend code in <strong className="text-slate-600 font-mono">{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-xs font-semibold text-brand-purple hover:underline focus:outline-none cursor-pointer"
                >
                  {isResending ? "Resending..." : "Resend WhatsApp passcode"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div />
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
