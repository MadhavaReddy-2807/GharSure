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

    const timer = setTimeout(checkAuthStatus, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient from-purple-50/40 via-transparent to-transparent pointer-events-none" />
      <div className="flex flex-col items-center text-center max-w-xs animate-fade-in z-10">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center mb-5">
          <Logo size="md" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Ghar<span className="text-brand-purple">Sure</span>
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-1 mb-8 tracking-wide uppercase">
          Household Intelligence & Care
        </p>
        {checking && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-brand-purple" />
            <span>Connecting...</span>
          </div>
        )}
      </div>
    </div>
  );
}
