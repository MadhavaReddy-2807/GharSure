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
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 max-w-sm mx-auto w-full">
      {/* Top Bar */}
      <div>
        <div className="pt-2 pb-6">
          <Link
            href="/auth"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 px-1.5 -ml-1.5 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change number</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Verify code
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sent to <span className="text-slate-700 font-medium">{maskPhone(phone)}</span>
          </p>
        </div>

        {mockHint && (
          <div className="mb-4 p-2.5 rounded-lg bg-orange-50 border border-orange-100 text-xs text-brand-orange flex items-center justify-between">
            <span>Dev Mock Mode</span>
            <span className="font-mono font-medium bg-white px-2 py-0.5 rounded border border-orange-200">
              {mockHint}
            </span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
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
                className="w-10 h-11 sm:w-11 sm:h-12 text-center text-lg font-medium text-slate-900 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:border-slate-800 focus:outline-none transition-colors disabled:opacity-50"
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => triggerVerification()}
            disabled={!isComplete || isLoading}
            className="w-full h-11 rounded-lg bg-brand-orange hover:bg-brand-orange-600 active:bg-brand-orange-700 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </button>

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
                className="text-xs font-medium text-brand-orange hover:underline focus:outline-none cursor-pointer"
              >
                {isResending ? "Resending..." : "Resend code via WhatsApp"}
              </button>
            )}
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
