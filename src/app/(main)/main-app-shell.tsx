"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart-drawer";

interface MainAppShellProps {
  customerName?: string | null;
  customerCoins?: number;
  children: React.ReactNode;
}

export function MainAppShell({ customerName, customerCoins, children }: MainAppShellProps) {
  const pathname = usePathname();
  const isSurvey = pathname?.startsWith("/surveys");

  return (
    <CartProvider>
      <div className="min-h-screen bg-slate-50/50 flex flex-col antialiased">
        {/* Top Application Header (Preserved across all destinations including surveys) */}
        <AppHeader fullName={customerName} coins={customerCoins} />

        {/* Main Content Area: Responsive container */}
        <main
          className={
            isSurvey
              ? "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 flex flex-col"
              : "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 pb-20 md:pb-10 flex flex-col"
          }
        >
          {children}
        </main>

        {/* Persistent Bottom Navigation (mobile only, hidden during active survey) */}
        {!isSurvey && <BottomNav />}

        {/* Slide-over Cart Drawer */}
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
