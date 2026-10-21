"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, MapPin, User, Sparkles } from "lucide-react";

const TOP_CITIES = [
  "Bangalore",
  "Mumbai",
  "Hyderabad",
  "Delhi NCR",
  "Pune",
  "Chennai",
  "Kolkata",
];

export default function OnboardingPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore any incomplete onboarding state on load
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
            if (data.customer.city) setCity(data.customer.city);
            if (data.customer.displayName) setDisplayName(data.customer.displayName);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedName = fullName.trim();
    const trimmedCity = city.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!trimmedCity || trimmedCity.length < 2) {
      setErrorMessage("Please select or enter your city.");
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
          city: trimmedCity,
          displayName: displayName.trim() || undefined,
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
      setErrorMessage("Network error occurred. Your input has been preserved, please retry.");
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return <div className="flex-1 min-h-screen bg-white" />;
  }

  return (
    <div className="flex-1 min-h-screen bg-white flex flex-col justify-between px-5 py-8 max-w-md mx-auto w-full safe-top safe-bottom">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2">
        <Logo size="md" showText />
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-brand-orange border border-orange-100">
          Step 2 of 2
        </span>
      </div>

      {/* Form Content */}
      <div className="my-auto py-6 animate-fade-in">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Almost there!</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight mb-2">
            Tell us about yourself
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Personalize your GharSure household intelligence reports and water quality insights.
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

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <Input
            id="full-name"
            label="Full Name *"
            placeholder="e.g. Priya Sharma"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            leftElement={<User className="w-5 h-5 text-slate-400" />}
            required
            autoFocus
            maxLength={100}
          />

          {/* Display Name (Optional) */}
          <Input
            id="display-name"
            label="Nickname or Preferred Name (Optional)"
            placeholder="e.g. Priya"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            helperText="How we address you on your household dashboard."
            maxLength={50}
          />

          {/* City Selection with Quick-Select Chips */}
          <div>
            <label
              htmlFor="city-input"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              City *
            </label>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {TOP_CITIES.map((c) => {
                const isSelected = city.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCity(c);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-brand-orange text-white shadow-sm ring-2 ring-brand-orange/30"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            <Input
              id="city-input"
              placeholder="Or type your city name"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              leftElement={<MapPin className="w-5 h-5 text-slate-400" />}
              required
              maxLength={100}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full text-base font-semibold"
              isLoading={isLoading}
              disabled={!fullName.trim() || !city.trim() || isLoading}
            >
              Complete Onboarding
            </Button>
          </div>
        </form>
      </div>

      {/* Footer info */}
      <footer className="text-center text-xs text-slate-400 pt-4">
        We never share your personal information with third-party advertisers.
      </footer>
    </div>
  );
}
