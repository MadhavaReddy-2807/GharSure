"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { normalizeIndianPhone } from "@/lib/phone";
import { AlertCircle } from "lucide-react";

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
      setErrorMessage("Network connection error. Please try again.");
      setIsLoading(false);
    }
  };

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

        {/* Auth Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-brand-navy">Sign In or Sign Up</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Enter your mobile number to receive a verification code on WhatsApp.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider"
              >
                Mobile Number
              </label>
              <div className="flex rounded-xl border border-slate-300 focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20 bg-white transition-all overflow-hidden">
                <div className="flex items-center px-3.5 bg-slate-50 border-r border-slate-200 text-slate-700 font-semibold text-sm select-none">
                  +91
                </div>
                <input
                  id="phone-input"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel-national"
                  placeholder="Enter 10-digit number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none disabled:opacity-50"
                  maxLength={10}
                  required
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full text-sm font-semibold"
              isLoading={isLoading}
              disabled={phoneNumber.length !== 10 || isLoading}
            >
              Continue
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400 leading-relaxed">
            By continuing, you agree to GharSure&apos;s{" "}
            <a href="#terms" className="text-slate-600 underline hover:text-brand-navy">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#privacy" className="text-slate-600 underline hover:text-brand-navy">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
