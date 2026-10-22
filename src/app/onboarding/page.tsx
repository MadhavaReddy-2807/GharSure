"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, User, MapPin, Loader2 } from "lucide-react";

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
      setErrorMessage("Network error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <Logo size="lg" className="mb-3" />
          <h1 className="text-2xl font-bold text-brand-navy tracking-tight">
            Ghar<span className="text-brand-orange">Sure</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Household Intelligence</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-brand-navy">Complete Your Profile</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Enter your details to receive local water quality reports and product trials.
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
            <Input
              id="full-name"
              label="Full Name"
              placeholder="e.g. Priya Sharma"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              leftElement={<User className="w-4 h-4 text-slate-400" />}
              required
              autoFocus
              maxLength={100}
            />

            <Input
              id="display-name"
              label="Preferred Name (Optional)"
              placeholder="e.g. Priya"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />

            <div>
              <label
                htmlFor="city-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                City
              </label>

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
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors select-none ${
                        isSelected
                          ? "bg-brand-orange text-white"
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
                placeholder="Or type city name"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                leftElement={<MapPin className="w-4 h-4 text-slate-400" />}
                required
                maxLength={100}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full text-sm font-semibold"
                isLoading={isLoading}
                disabled={!fullName.trim() || !city.trim() || isLoading}
              >
                Save and Continue
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
