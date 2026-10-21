"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Loader2 } from "lucide-react";

export default function SplashScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAuthStatus() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!isMounted) return;

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.customer) {
            if (data.customer.onboardingCompleted) {
              router.replace("/home");
              return;
            } else {
              router.replace("/onboarding");
              return;
            }
          }
        }
        // If not authenticated or error, go to auth
        router.replace("/auth");
      } catch {
        if (isMounted) {
          router.replace("/auth");
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    }

    // Small delay (350ms) to allow subtle branding fade-in without artificial blocking
    const timer = setTimeout(checkAuthStatus, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="flex-1 min-h-screen bg-white flex flex-col items-center justify-between px-6 py-12 select-none safe-top safe-bottom">
      <div className="w-full" />

      {/* Center Branding */}
      <div className="flex flex-col items-center text-center animate-fade-in max-w-sm">
        <Logo size="xl" className="mb-6 drop-shadow-sm" />
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight mb-2">
          Ghar<span className="text-brand-orange">Sure</span>
        </h1>
        <p className="text-sm font-medium text-slate-500 max-w-[260px] leading-relaxed">
          Intelligent Household Decisions for Modern Indian Homes
        </p>
      </div>

      {/* Bottom Loading Indicator */}
      <div className="flex flex-col items-center justify-center min-h-[48px]">
        {checking && (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
            <span>Loading experience...</span>
          </div>
        )}
      </div>
    </div>
  );
}
