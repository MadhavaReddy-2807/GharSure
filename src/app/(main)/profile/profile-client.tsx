"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Home,
  MapPin,
  Bookmark,
  Bell,
  HelpCircle,
  Shield,
  Settings,
  LogOut,
  Coins,
  User,
} from "lucide-react";

interface ProfileClientViewProps {
  fullName: string;
  phone: string;
  city: string;
  coins: number;
}

export function ProfileClientView({ fullName, phone, city, coins }: ProfileClientViewProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  // Generate initials for avatar fallback (e.g. "Madhava Reddy" -> "MR")
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "GS";

  return (
    <div className="max-w-md mx-auto w-full space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-1 pb-2">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl text-brand-navy hover:bg-slate-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-navy tracking-tight">
          Profile
        </h1>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 border-2 border-slate-100 flex items-center justify-center shrink-0 shadow-inner">
          <span className="text-xl font-bold text-brand-navy tracking-tight">
            {initials}
          </span>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-brand-navy truncate leading-snug">
            {fullName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {phone}
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-orange hover:underline mt-1"
          >
            <span>Edit Profile</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>

      {/* Group 1: Household & Coins */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
        {/* My Household */}
        <Link
          href="/home"
          className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-3.5">
            <Home className="w-5 h-5 text-brand-navy stroke-[2]" />
            <span className="text-sm font-semibold text-brand-navy">
              My Household
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </Link>

        {/* Location & Building */}
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3.5">
            <MapPin className="w-5 h-5 text-brand-navy stroke-[2]" />
            <div>
              <span className="text-sm font-semibold text-brand-navy block">
                Location & Building
              </span>
              {city && (
                <span className="text-xs text-slate-400 font-medium">{city}</span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        {/* GharSure Coins */}
        <Link
          href="/rewards"
          className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-xs">
              <Coins className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-brand-navy">
              GharSure Coins
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm sm:text-base font-extrabold text-brand-orange">
              {coins.toLocaleString()}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </Link>

        {/* Saved Items */}
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3.5">
            <Bookmark className="w-5 h-5 text-brand-navy stroke-[2]" />
            <span className="text-sm font-semibold text-brand-navy">
              Saved Items
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>

      {/* Group 2: Settings & Support */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
        {/* Notifications */}
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3.5">
            <Bell className="w-5 h-5 text-brand-navy stroke-[2]" />
            <span className="text-sm font-semibold text-brand-navy">
              Notifications
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        {/* Help & Support */}
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3.5">
            <HelpCircle className="w-5 h-5 text-brand-navy stroke-[2]" />
            <span className="text-sm font-semibold text-brand-navy">
              Help & Support
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        {/* Privacy & Data */}
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3.5">
            <Shield className="w-5 h-5 text-brand-navy stroke-[2]" />
            <span className="text-sm font-semibold text-brand-navy">
              Privacy & Data
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        {/* Settings */}
        <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group cursor-pointer">
          <div className="flex items-center gap-3.5">
            <Settings className="w-5 h-5 text-brand-navy stroke-[2]" />
            <span className="text-sm font-semibold text-brand-navy">
              Settings
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full py-3.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-100 text-red-600 font-bold text-sm flex items-center justify-center gap-2 transition-colors select-none"
        >
          <LogOut className="w-4 h-4 stroke-[2.5]" />
          <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
        </button>
      </div>
    </div>
  );
}
