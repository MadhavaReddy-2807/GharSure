"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Home, Award, Users, ShoppingBag, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  fullName?: string | null;
  coins?: number;
}

const desktopNavItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Rewards", href: "/rewards", icon: Award },
  { name: "Refer & Win", href: "/refer", icon: Users },
  { name: "Store", href: "/store", icon: ShoppingBag },
];

export function AppHeader({ fullName, coins = 0 }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            href="/home"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded-lg"
          >
            <Logo size="sm" showText />
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-1.5"
          >
            {desktopNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all select-none",
                    isActive
                      ? "bg-brand-purple text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action: GharSure Coins & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* GharSure Coins Badge */}
            <Link
              href="/rewards"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 transition-colors select-none shadow-2xs"
              title="GharSure Coins - Earn & Redeem"
            >
              <Coins className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold font-mono">
                {coins.toLocaleString()}
              </span>
              <span className="text-[11px] font-medium text-amber-700 hidden sm:inline">
                Coins
              </span>
            </Link>

            {/* Profile Avatar & Name */}
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border transition-all select-none shadow-2xs",
                pathname === "/profile"
                  ? "border-brand-purple bg-purple-50 ring-2 ring-brand-purple/20"
                  : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
              )}
              title="My Profile"
              aria-label="My Profile"
            >
              <div className="w-7 h-7 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                {fullName ? fullName[0]?.toUpperCase() : "U"}
              </div>
              <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate hidden sm:inline">
                {fullName || "Profile"}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
