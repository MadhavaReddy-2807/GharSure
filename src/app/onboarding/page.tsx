"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Home,
  Droplets,
  Wrench,
  Check,
} from "lucide-react";

interface ReferralValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  message: string | null;
  referrerName: string | null;
  bonusCoins: number | null;
}

const ONBOARDING_DRAFT_KEY = "gharsure_onboarding_draft";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Step state: 1 = Profile, 2 = Household, 3 = Priorities, 4 = Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Profile
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralState, setReferralState] = useState<ReferralValidationState>({
    isValidating: false,
    isValid: null,
    message: null,
    referrerName: null,
    bonusCoins: null,
  });

  // Step 2: Household Info
  const [homeType, setHomeType] = useState<string>("APARTMENT");
  const [waterSource, setWaterSource] = useState<string>("MUNICIPAL");
  const [appliances, setAppliances] = useState<string[]>(["RO_PURIFIER", "GEYSER"]);

  // Step 3: Household Priorities
  const [concerns, setConcerns] = useState<string[]>(["WATER_HARDNESS", "DRINKING_PURITY"]);

  // Global UX state
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore draft from sessionStorage if available
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.displayName) setDisplayName(parsed.displayName);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.referralCode) setReferralCode(parsed.referralCode);
        if (parsed.homeType) setHomeType(parsed.homeType);
        if (parsed.waterSource) setWaterSource(parsed.waterSource);
        if (Array.isArray(parsed.appliances)) setAppliances(parsed.appliances);
        if (Array.isArray(parsed.concerns)) setConcerns(parsed.concerns);
        if (typeof parsed.step === "number" && parsed.step >= 1 && parsed.step <= 4) {
          setCurrentStep(parsed.step);
        }
      }
    } catch {}
  }, []);

  // Save draft whenever inputs change
  useEffect(() => {
    if (isInitializing) return;
    try {
      sessionStorage.setItem(
        ONBOARDING_DRAFT_KEY,
        JSON.stringify({
          fullName,
          displayName,
          location,
          referralCode,
          homeType,
          waterSource,
          appliances,
          concerns,
          step: currentStep,
        })
      );
    } catch {}
  }, [fullName, displayName, location, referralCode, homeType, waterSource, appliances, concerns, currentStep, isInitializing]);

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
      } catch {}
    }
    if (pending && pending.trim()) {
      setReferralCode(pending.trim().toUpperCase());
    }
  }, [searchParams]);

  // Load existing user profile to check if already completed
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
            if (data.customer.fullName && !fullName) setFullName(data.customer.fullName);
            if (data.customer.city && !location) setLocation(data.customer.city);
            if (data.customer.displayName && !displayName) setDisplayName(data.customer.displayName);
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
  }, [router, fullName, location, displayName]);

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
        message: "Could not verify referral code.",
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
          const geocodingApi = (process.env.NEXT_PUBLIC_GEOCODING_API_URL || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
          const res = await fetch(
            `${geocodingApi}/reverse?lat=${latitude}&lon=${longitude}&format=json`
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
        } catch {}
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
    } catch {}
  };

  const toggleAppliance = (app: string) => {
    setAppliances((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const toggleConcern = (concern: string) => {
    setConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const handleNextStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setErrorMessage("Please enter your full name (at least 2 characters).");
        return;
      }
      if (!location.trim() || location.trim().length < 2) {
        setErrorMessage("Please enter or detect your city / locality.");
        return;
      }
      if (referralCode.trim() && referralState.isValid === false) {
        setErrorMessage("Please remove or fix the invalid referral code before proceeding.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!homeType) {
        setErrorMessage("Please select your home type.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter your name.");
      setCurrentStep(1);
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
          displayName: displayName.trim() || undefined,
          city: location.trim() || undefined,
          referralCode: referralCode.trim() || undefined,
          householdDetails: {
            homeType,
            waterSource,
            appliances,
            concerns,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to complete onboarding. Please try again.");
        setIsLoading(false);
        return;
      }

      // Clear draft on successful completion
      try {
        sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
        sessionStorage.removeItem("gharsure_pending_ref");
        document.cookie = "gharsure_pending_ref=; path=/; max-age=0";
      } catch {}

      // Redirect to Home
      router.replace(data.nextStep || "/home");
    } catch {
      setErrorMessage("Connection issue. Please verify your internet and try again.");
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-brand-navy animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Checking account status...</p>
      </div>
    );
  }

  const stepTitles = ["Profile", "Household", "Priorities", "Review"];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full mx-auto my-auto py-4">
        {/* Step Indicator Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Step {currentStep} of 4: {stepTitles[currentStep - 1]}</span>
            <span className="font-mono">{Math.round((currentStep / 4) * 100)}%</span>
          </div>
          {/* Progress bar */}
          <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-full transition-all duration-300 ${
                  currentStep >= step ? "bg-brand-navy" : "bg-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: Basic Profile */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Details</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tell us who you are to personalize your household intelligence.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Display / Preferred Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ramesh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-navy"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  City / Locality <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bengaluru, Whitefield"
                    className="w-full px-3.5 py-2.5 pr-24 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-navy"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 text-xs font-medium text-brand-navy bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                    <span>{isLocating ? "Locating..." : "Auto-fill"}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Referral Code <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GH123456"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-wider uppercase focus:outline-none ${
                      referralState.isValid === true
                        ? "border-emerald-500 bg-emerald-50/20"
                        : referralState.isValid === false
                        ? "border-red-400 bg-red-50/20"
                        : "border-slate-200"
                    }`}
                  />
                  {referralCode && (
                    <button
                      type="button"
                      onClick={handleClearReferralCode}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {referralState.message && (
                  <p
                    className={`text-xs mt-1.5 flex items-center gap-1 ${
                      referralState.isValid ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {referralState.isValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {referralState.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Household Info */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Household</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Helps GharSure assess water hardness, power consistency, and appliance care.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Home Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "APARTMENT", label: "Apartment" },
                    { id: "VILLA", label: "Villa / Row House" },
                    { id: "INDEPENDENT", label: "Independent House" },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setHomeType(t.id)}
                      className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                        homeType === t.id
                          ? "border-brand-navy bg-brand-navy/5 text-brand-navy shadow-xs"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Primary Water Source</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "MUNICIPAL", label: "Municipal Tap Water" },
                    { id: "BOREWELL", label: "Deep Borewell" },
                    { id: "TANKER", label: "Private Tanker" },
                    { id: "MIXED", label: "Mixed / Dual Supply" },
                  ].map((w) => (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => setWaterSource(w.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left flex items-center justify-between transition-all ${
                        waterSource === w.id
                          ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <span>{w.label}</span>
                      {waterSource === w.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Key Appliances in Your Home
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "RO_PURIFIER", label: "RO Water Purifier" },
                    { id: "GEYSER", label: "Water Geyser / Heater" },
                    { id: "WASHING_MACHINE", label: "Washing Machine" },
                    { id: "DISHWASHER", label: "Dishwasher" },
                    { id: "WATER_SOFTENER", label: "Water Softener" },
                    { id: "INVERTER", label: "Home Inverter" },
                  ].map((app) => {
                    const isSelected = appliances.includes(app.id);
                    return (
                      <button
                        type="button"
                        key={app.id}
                        onClick={() => toggleAppliance(app.id)}
                        className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <span>{app.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Priorities & Preferences */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Household Priorities</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select what matters most to your home so we can highlight relevant tests & discounts.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { id: "WATER_HARDNESS", label: "Water Hardness & Scaling (TDS check)", desc: "Prevent scaling on taps, geysers, and appliances." },
                  { id: "DRINKING_PURITY", label: "Drinking Water Purity & Filtration", desc: "Filter health, bacteria check, and lab testing." },
                  { id: "APPLIANCE_CARE", label: "Appliance Longevity & Service Care", desc: "Periodic descaling and servicing reminders." },
                  { id: "DAMPNESS_LEAK", label: "Wall Dampness & Plumbing Integrity", desc: "Prevent seepage, pipe leaks, and wall peeling." },
                ].map((item) => {
                  const isSelected = concerns.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleConcern(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-brand-navy bg-brand-navy/5 text-brand-navy"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{item.label}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? "bg-brand-navy border-brand-navy text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Review and Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Review & Confirm</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Everything looks ready. Confirm your details to complete your verified account setup.
                </p>
              </div>

              {/* Summary table */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Name</span>
                  <span className="font-semibold text-slate-900">{fullName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Location</span>
                  <span className="font-semibold text-slate-900">{location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Home Type</span>
                  <span className="font-semibold text-slate-900">{homeType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Water Supply</span>
                  <span className="font-semibold text-slate-900">{waterSource}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/80">
                  <span className="text-slate-500">Appliances</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {appliances.length} registered
                  </span>
                </div>
                {referralCode && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Referral Bonus</span>
                    <span className="font-semibold text-emerald-700 font-mono">+100 Coins</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  You will receive <strong>100 Welcome Coins</strong> in your GharSure wallet immediately upon setup!
                </span>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 ml-auto shadow-xs disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Completing Setup...</span>
                  </>
                ) : (
                  <>
                    <span>Complete & Enter Home</span>
                    <Check className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-navy animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
