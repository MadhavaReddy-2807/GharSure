"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { maskPhone, normalizeIndianPhone } from "@/lib/phone";
import { ArrowLeft, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState<string>("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

    // Retrieve dev mock OTP hint if present
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

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    const digitsOnly = value.replace(/\D/g, "");
    if (errorMessage) setErrorMessage(null);

    // Handle single digit input
    if (digitsOnly.length <= 1) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = digitsOnly;
      setOtpDigits(nextDigits);

      if (digitsOnly && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto submit if 6th digit entered
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

      setSuccessMessage("Verified successfully! Redirecting...");
      sessionStorage.removeItem("gharsure_dev_mock_otp");

      setTimeout(() => {
        router.replace(data.nextStep || "/home");
      }, 400);
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
      setErrorMessage("Network error. Could not resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = otpDigits.every((d) => d.length === 1);

  return (
    <div className="flex-1 min-h-screen bg-white flex flex-col justify-between px-5 py-8 max-w-md mx-auto w-full safe-top safe-bottom">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => router.push("/auth")}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-navy p-2 -ml-2 rounded-lg transition-colors"
          aria-label="Back to phone number entry"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit number</span>
        </button>
        <Logo size="sm" />
      </div>

      {/* Main Form Content */}
      <div className="my-auto py-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight mb-2">
            Verify WhatsApp Code
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            We sent a 6-digit verification code to WhatsApp on{" "}
            <span className="font-semibold text-brand-navy">{maskPhone(phone)}</span>.
          </p>
        </div>

        {mockHint && (
          <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-brand-orange-800">
            <span className="font-bold">Dev Mock Mode Active:</span> Use OTP code{" "}
            <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-orange-300 text-brand-orange">
              {mockHint}
            </code>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 6 Digit Input Group */}
        <div className="flex justify-between gap-2 sm:gap-2.5 mb-6" onPaste={handlePaste}>
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={idx === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={isLoading}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border border-slate-300 bg-white text-brand-navy focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 focus:outline-none transition-all disabled:opacity-50"
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>

        <Button
          onClick={() => triggerVerification()}
          variant="primary"
          size="lg"
          className="w-full text-base font-semibold"
          isLoading={isLoading}
          disabled={!isComplete || isLoading}
        >
          Verify & Continue
        </Button>

        {/* Resend Cooldown */}
        <div className="mt-6 text-center">
          {cooldown > 0 ? (
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Resend code via WhatsApp in{" "}
              <span className="font-bold text-brand-navy font-mono">{cooldown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand-orange hover:text-brand-orange-700 active:scale-95 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`} />
              <span>Resend WhatsApp Code</span>
            </button>
          )}
        </div>
      </div>

      {/* Safety Notice */}
      <footer className="text-center text-xs text-slate-400 pt-4">
        Didn&apos;t receive it? Check your WhatsApp notifications or wait for the resend countdown.
      </footer>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-white min-h-screen" />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
