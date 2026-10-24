"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, AlertCircle, Loader2, CheckCircle2, XCircle, X } from "lucide-react";

interface ReferralValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  message: string | null;
  referrerName: string | null;
  bonusCoins: number | null;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralState, setReferralState] = useState<ReferralValidationState>({
    isValidating: false,
    isValid: null,
    message: null,
    referrerName: null,
    bonusCoins: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check URL param or stored pending ref
  useEffect(() => {
    let pending = searchParams?.get("ref");
    if (!pending && typeof window !== "undefined") {
      try {
        pending = sessionStorage.getItem("gharsure_pending_ref");
        if (!pending) {
          const match = document.cookie.match(/gharsure_pending_ref=([^;]+)/);
          if (match) pending = match[1];
        }
      } catch {
        // storage disabled
      }
    }
    if (pending && pending.trim()) {
      setReferralCode(pending.trim().toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    async function loadExistingProfile() {
      try {
        const res = await fetch("/api/auth/me");
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.customer) {
            if (data.customer.onboardingCompleted) {
              router.replace("/home");
              return;
            }
            if (data.customer.fullName) setFullName(data.customer.fullName);
            if (data.customer.city) setLocation(data.customer.city);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    loadExistingProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Debounced live referral code validation
  const validateCode = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setReferralState({
        isValidating: false,
        isValid: null,
        message: null,
        referrerName: null,
        bonusCoins: null,
      });
      return;
    }

    if (clean.length < 4) {
      setReferralState({
        isValidating: false,
        isValid: null,
        message: null,
        referrerName: null,
        bonusCoins: null,
      });
      return;
    }

    setReferralState((prev) => ({ ...prev, isValidating: true, message: null }));

    try {
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setReferralState({
          isValidating: false,
          isValid: true,
          message: `Code applied! +${data.bonusCoins || 100} welcome coins via ${data.referrerName || "neighbor"}`,
          referrerName: data.referrerName || null,
          bonusCoins: data.bonusCoins || 100,
        });
      } else {
        setReferralState({
          isValidating: false,
          isValid: false,
          message: data.error || "Invalid referral code.",
          referrerName: null,
          bonusCoins: null,
        });
      }
    } catch {
      setReferralState({
        isValidating: false,
        isValid: false,
        message: "Could not verify referral code. Please check your network.",
        referrerName: null,
        bonusCoins: null,
      });
    }
  }, []);

  useEffect(() => {
    if (!referralCode.trim()) {
      setReferralState({
        isValidating: false,
        isValid: null,
        message: null,
        referrerName: null,
        bonusCoins: null,
      });
      return;
    }

    const timer = setTimeout(() => {
      validateCode(referralCode);
    }, 450);

    return () => clearTimeout(timer);
  }, [referralCode, validateCode]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.suburb ||
              data.address?.state_district ||
              data.address?.state;
            if (city) {
              setLocation(city);
              setIsLocating(false);
              return;
            }
          }
        } catch {
          // Fallback to formatted coords
        }
        setLocation(`${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleClearReferralCode = () => {
    setReferralCode("");
    setReferralState({
      isValidating: false,
      isValid: null,
      message: null,
      referrerName: null,
      bonusCoins: null,
    });
    try {
      sessionStorage.removeItem("gharsure_pending_ref");
      document.cookie = "gharsure_pending_ref=; path=/; max-age=0";
    } catch {
      // storage disabled
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter your name (at least 2 characters).");
      return;
    }

    if (referralCode.trim() && referralState.isValid === false) {
      setErrorMessage("Please remove or correct the invalid referral code before proceeding.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/customer/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          city: location.trim() || undefined,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to save profile. Please try again.");
        setIsLoading(false);
        return;
      }

      // Clear any pending referral code after successful attribution
      try {
        sessionStorage.removeItem("gharsure_pending_ref");
        document.cookie = "gharsure_pending_ref=; path=/; max-age=0";
      } catch {
        // storage disabled
      }

      router.replace("/home");
    } catch {
      setErrorMessage("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />
      </div>
    );
  }

  const POPULAR_CITIES = ["Bangalore", "Mumbai", "Delhi NCR", "Pune", "Hyderabad"];

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col justify-between p-4 sm:p-6 select-none">
      <div className="max-w-sm mx-auto w-full pt-4 sm:pt-8">
        <div className="flex items-center justify-between mb-8">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            Step 2 of 2
          </span>
          <span className="text-xs text-slate-400 font-medium">Profile Setup</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Personalize your home
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              We personalize your localized water reports, trials, and appliance alerts.
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
            {/* Name Field */}
            <div>
              <label
                htmlFor="full-name"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                placeholder="e.g. Madhava Reddy"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                autoFocus
                maxLength={100}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 focus:outline-none transition-all shadow-xs"
              />
            </div>

            {/* Location with Quick Chips and GPS */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="location-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  City / Locality <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-purple hover:underline cursor-pointer disabled:opacity-50"
                >
                  <MapPin className="w-3 h-3" />
                  <span>{isLocating ? "Locating..." : "Use GPS"}</span>
                </button>
              </div>
              <input
                id="location-input"
                type="text"
                placeholder="e.g. Bangalore, Indiranagar"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 focus:outline-none transition-all shadow-xs"
              />

              {/* Quick Pick Cities */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLocation(c)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors ${
                      location === c
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Referral Code with Live Feedback */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="referral-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Referral code <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                {referralCode && (
                  <button
                    type="button"
                    onClick={handleClearReferralCode}
                    className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="referral-input"
                  type="text"
                  placeholder="e.g. GS7K9P2X"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  maxLength={20}
                  className={`w-full h-11 rounded-xl border bg-white px-3.5 pr-10 text-xs sm:text-sm font-mono font-bold tracking-wider placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none transition-all shadow-xs uppercase ${
                    referralState.isValid === true
                      ? "border-emerald-500 focus:border-emerald-600 bg-emerald-50/20"
                      : referralState.isValid === false
                      ? "border-red-400 focus:border-red-500 bg-red-50/20"
                      : "border-slate-200 hover:border-slate-300 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
                  }`}
                />

                <div className="absolute right-3 top-3">
                  {referralState.isValidating && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  )}
                  {!referralState.isValidating && referralState.isValid === true && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {!referralState.isValidating && referralState.isValid === false && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Validation Feedback Message */}
              {referralState.message && (
                <p
                  className={`text-[11px] mt-1.5 flex items-center gap-1.5 ${
                    referralState.isValid === true
                      ? "text-emerald-700 font-medium"
                      : referralState.isValid === false
                      ? "text-red-600 font-medium"
                      : "text-slate-500"
                  }`}
                >
                  {referralState.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={fullName.trim().length < 2 || isLoading || referralState.isValidating}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-40 text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <span>Complete Onboarding</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <footer className="text-center text-[11px] text-slate-400 py-4 max-w-sm mx-auto">
        Your data is private and never shared with commercial advertisers.
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-brand-purple" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
