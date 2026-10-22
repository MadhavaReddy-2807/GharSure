"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, AlertCircle, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
          // Attempt client reverse geocode using public OSM Nominatim
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
        // Optional location - no intrusive error if user denies
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter your name (at least 2 characters).");
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

      router.replace("/home");
    } catch {
      setErrorMessage("Connection error. Please try again.");
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 max-w-sm mx-auto w-full">
      {/* Top Bar & Header */}
      <div>
        <div className="pt-2 pb-6">
          <span className="text-xs font-medium text-slate-400">Step 2 of 2</span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Tell us your name
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            We will personalize your household reports and trials.
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
          {/* Name Field */}
          <div>
            <label
              htmlFor="full-name"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Name
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
              className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus:border-slate-800 focus:outline-none transition-colors"
            />
          </div>

          {/* Optional Location with GPS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="location-input"
                className="block text-xs font-medium text-slate-600"
              >
                Location <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="inline-flex items-center gap-1 text-xs text-brand-orange hover:underline cursor-pointer disabled:opacity-50"
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
              className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus:border-slate-800 focus:outline-none transition-colors"
            />
          </div>

          {/* Optional Referral Code */}
          <div>
            <label
              htmlFor="referral-input"
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Referral code <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="referral-input"
              type="text"
              placeholder="e.g. GH000001"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={30}
              className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 font-mono placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus:border-slate-800 focus:outline-none transition-colors uppercase"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={fullName.trim().length < 2 || isLoading}
              className="w-full h-11 rounded-lg bg-brand-orange hover:bg-brand-orange-600 active:bg-brand-orange-700 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Proceed"}
            </button>
          </div>
        </form>
      </div>

      <footer className="text-center text-xs text-slate-400 py-4">
        Your data is private and never shared with advertisers.
      </footer>
    </div>
  );
}
