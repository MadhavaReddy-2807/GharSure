"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { normalizeIndianPhone } from "@/lib/phone";
import { ArrowLeft, AlertCircle } from "lucide-react";

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
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 max-w-sm mx-auto w-full">
      {/* Top Bar */}
      <div>
        <div className="pt-2 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 px-1.5 -ml-1.5 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Enter your mobile number
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            We will send a 6-digit verification code to WhatsApp.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="phone-input"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Mobile number
            </label>
            <div className="flex h-11 rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus-within:border-slate-800 transition-colors overflow-hidden">
              <span className="flex items-center px-3 text-sm text-slate-600 bg-slate-50/50 border-r border-slate-200 select-none">
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
                className="flex-1 px-3 text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent focus:outline-none"
                maxLength={10}
                required
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={phoneNumber.length !== 10 || isLoading}
            className="w-full h-11 rounded-lg bg-brand-orange hover:bg-brand-orange-600 active:bg-brand-orange-700 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending code..." : "Continue"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 py-4">
        By continuing, you agree to our Terms and Privacy Policy.
      </footer>
    </div>
  );
}
