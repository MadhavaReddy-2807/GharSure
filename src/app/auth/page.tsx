"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeIndianPhone } from "@/lib/phone";
import { AlertCircle, ShieldCheck } from "lucide-react";

export default function PhoneAuthPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numbers and max 10 digits
    const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhoneNumber(clean);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const normalized = normalizeIndianPhone(phoneNumber);
    if (!normalized) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number.");
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

      // Store unverified phone temporarily for OTP verification screen
      sessionStorage.setItem("gharsure_auth_phone", normalized);
      if (data.devMockOtp) {
        sessionStorage.setItem("gharsure_dev_mock_otp", data.devMockOtp);
      }

      router.push(`/auth/verify?phone=${encodeURIComponent(normalized)}`);
    } catch {
      setErrorMessage("Network connection error. Please check your internet and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-white flex flex-col justify-between px-5 py-8 max-w-md mx-auto w-full safe-top safe-bottom">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <Logo size="md" showText />
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-6 animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight mb-2">
            Welcome to GharSure
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Enter your mobile number to get started with instant WhatsApp OTP verification.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="phone-input"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Mobile Number
            </label>
            <div className="flex rounded-xl shadow-sm border border-slate-300 focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20 bg-white transition-all">
              {/* Country selector defaulting to India */}
              <div className="flex items-center pl-3.5 pr-2.5 py-3 border-r border-slate-200 bg-slate-50 rounded-l-xl text-slate-700 font-medium select-none text-sm sm:text-base">
                <span className="mr-1.5 text-base">🇮🇳</span>
                <span className="font-semibold text-brand-navy">+91</span>
              </div>

              {/* Phone number input */}
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
                className="flex-1 px-3.5 py-3 text-base sm:text-lg font-medium text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none disabled:opacity-50"
                maxLength={10}
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              We&apos;ll send a one-time verification code via WhatsApp.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full text-base font-semibold"
            isLoading={isLoading}
            disabled={phoneNumber.length !== 10 || isLoading}
          >
            Continue
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Your data is strictly protected under the DPDP Act 2023.</span>
        </div>
      </div>

      {/* Footer Terms & Privacy */}
      <footer className="text-center text-xs text-slate-400 pt-4 border-t border-slate-100">
        By continuing, you agree to GharSure&apos;s{" "}
        <a href="#terms" className="underline hover:text-slate-600">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#privacy" className="underline hover:text-slate-600">
          Privacy Policy
        </a>
        .
      </footer>
    </div>
  );
}
