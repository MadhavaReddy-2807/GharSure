"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Droplets, Wrench, Gift, ShieldCheck } from "lucide-react";

export default function HomePageBanner() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
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
      } catch {
        // Stay on banner
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between p-6 sm:p-8 max-w-md mx-auto w-full select-none">
      {/* Top Brand Header */}
      <div className="pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.jpeg"
              alt="GharSure Logo"
              width={40}
              height={40}
              priority
              className="object-contain w-full h-full p-1"
            />
          </div>
          <div>
            <span className="font-bold text-lg text-brand-navy tracking-tight leading-none block">
              Ghar<span className="text-brand-orange">Sure</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Household Intelligence</span>
          </div>
        </div>

        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          India
        </span>
      </div>

      {/* Center Value Content */}
      <div className="my-auto py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight leading-tight mb-3">
          Smarter decisions for your household
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-8">
          Monitor your home’s water quality, keep appliances running smoothly, and discover verified essentials.
        </p>

        {/* Feature Highlights */}
        <div className="space-y-4">
          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-brand-navy">Water Quality Reports</h2>
              <p className="text-xs text-slate-500 mt-0.5">Local TDS, hardness levels, and filter advice.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center shrink-0 mt-0.5">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-brand-navy">Appliance Health</h2>
              <p className="text-xs text-slate-500 mt-0.5">Maintenance reminders and genuine spare alerts.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-brand-navy">Zero-Cost Product Trials</h2>
              <p className="text-xs text-slate-500 mt-0.5">Claim full-size home care trial kits for ₹0.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="pb-4 space-y-3">
        <Link
          href="/auth"
          className="w-full h-12 rounded-xl bg-brand-orange hover:bg-brand-orange-600 active:bg-brand-orange-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <p className="text-center text-[11px] text-slate-400">
          Fast verification with WhatsApp · Free for Indian households
        </p>
      </div>
    </div>
  );
}
