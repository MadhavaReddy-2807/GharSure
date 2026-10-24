"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizeIndianPhone } from "@/lib/phone";
import { ArrowLeft, AlertCircle, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export default function PhoneAuthPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(clean);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const normalized = normalizeIndianPhone(phoneNumber);
    if (!normalized) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Unable to send verification code. Please try again.");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("gharsure_auth_phone", normalized);
      if (data.devMockOtp) {
        sessionStorage.setItem("gharsure_dev_mock_otp", data.devMockOtp);
      }

      router.push(`/auth/verify?phone=${encodeURIComponent(normalized)}`);
    } catch {
      setErrorMessage("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Header / Brand */}
      <div className="max-w-sm mx-auto w-full pt-4 sm:pt-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm font-bold text-brand-navy tracking-tight">GharSure</span>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 mb-3">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Verification</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Enter mobile number
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              We will send a secure 6-digit one-time passcode to your WhatsApp number.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Phone Number
              </label>
              <div className="flex h-11 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-brand-purple focus-within:ring-2 focus-within:ring-brand-purple/20 transition-all overflow-hidden shadow-xs">
                <span className="flex items-center px-3.5 text-xs font-bold text-slate-600 bg-slate-50 border-r border-slate-200 select-none">
                  +91
                </span>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel-national"
                  placeholder="98765 43210"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  disabled={isLoading}
                  className="flex-1 px-3.5 text-sm font-semibold tracking-wide text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent focus:outline-none"
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={phoneNumber.length !== 10 || isLoading}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-40 text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Zero spam. Secure 256-bit encrypted login.</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-4 max-w-sm mx-auto">
        By continuing, you agree to GharSure&apos;s{" "}
        <span className="text-slate-600 underline cursor-pointer">Terms of Service</span> and{" "}
        <span className="text-slate-600 underline cursor-pointer">Privacy Policy</span>.
      </footer>
    </div>
  );
}
