"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { cn } from "@/lib/utils";

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

        {/* Main Content Area: Responsive container with stable min-height & seamless transition */}
        <main
          className={cn(
            "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 flex flex-col min-h-[calc(100vh-4rem)]",
            isSurvey ? "py-5 md:py-8" : "pb-24 md:pb-10"
          )}
        >
          <div key={pathname} className="animate-fade-in flex-1 flex flex-col w-full">
            {children}
          </div>
        </main>

        {/* Persistent Bottom Navigation (mobile only, hidden during active survey) */}
        {!isSurvey && <BottomNav />}

        {/* Slide-over Cart Drawer */}
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
