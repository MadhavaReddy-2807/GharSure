"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

interface MainAppShellProps {
  customerName?: string | null;
  customerCoins?: number;
  children: React.ReactNode;
}

export function MainAppShell({ customerName, customerCoins, children }: MainAppShellProps) {
  const pathname = usePathname();
  const isSurvey = pathname?.startsWith("/surveys");

  if (isSurvey) {
    // Dedicated standalone immersive canvas for surveys (matching reference screenshot)
    return <div className="min-h-screen bg-[#EDF4FE]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col antialiased">
      {/* Top Application Header with Coins & Profile */}
      <AppHeader fullName={customerName} coins={customerCoins} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 pb-24 md:pb-12 flex flex-col">
        {children}
      </main>

      {/* Persistent Bottom Navigation (mobile only, hidden on md+) */}
      <BottomNav />
    </div>
  );
}
