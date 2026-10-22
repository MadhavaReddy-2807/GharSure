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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none">
      <div className="flex flex-col items-center text-center">
        <Logo size="lg" className="mb-4" />
        <h1 className="text-2xl font-bold text-brand-navy tracking-tight">
          Ghar<span className="text-brand-orange">Sure</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Household Intelligence</p>
        {checking && <Loader2 className="w-5 h-5 animate-spin text-brand-orange" />}
      </div>
    </div>
  );
}
