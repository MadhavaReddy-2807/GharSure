"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Coins, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  fullName?: string | null;
  coins?: number;
}

const desktopNavItems = [
  { name: "Home", href: "/home" },
  { name: "Rewards", href: "/rewards" },
  { name: "Refer & Win", href: "/refer" },
  { name: "Store", href: "/store" },
];

export function AppHeader({ fullName, coins = 0 }: AppHeaderProps) {
  const pathname = usePathname();
  const { totalCount, openCart } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo (Left) */}
          <Link
            href="/home"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <Logo size="sm" showText />
          </Link>

          {/* Desktop Navigation Links (Center, Clean Underline Style) */}
          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-8"
          >
            {desktopNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "text-xs sm:text-sm tracking-wide transition-colors select-none py-1 relative font-medium",
                    isActive
                      ? "text-[#2563EB] font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Utilities (Coins, Shopping Cart & Profile) */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* GharSure Coins Badge */}
            <Link
              href="/rewards"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 transition-colors text-xs select-none"
              title="GharSure Coins"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-bold font-mono">
                {coins.toLocaleString()}
              </span>
              <span className="text-amber-700 hidden sm:inline text-[11px] font-medium">
                Coins
              </span>
            </Link>

            {/* Shopping Cart Icon with Live Counter */}
            <button
              onClick={openCart}
              className="relative p-1.5 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              title="Open Shopping Cart"
              aria-label={`Shopping cart with ${totalCount} items`}
            >
              <ShoppingCart className="w-5 h-5 stroke-[2]" />
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#2563EB] text-white font-bold text-[10px] flex items-center justify-center leading-none shadow-xs">
                {totalCount}
              </span>
            </button>

            {/* Profile Avatar & Name */}
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border transition-all select-none text-xs",
                pathname === "/profile"
                  ? "border-[#2563EB] bg-blue-50 text-[#2563EB] font-semibold"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              )}
              title="My Account"
              aria-label="My Account"
            >
              <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-[10px]">
                {fullName ? fullName[0]?.toUpperCase() : "U"}
              </div>
              <span className="max-w-[100px] truncate hidden sm:inline font-medium">
                {fullName || "Profile"}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
