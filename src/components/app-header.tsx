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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15">
          {/* Brand Logo */}
          <Link
            href="/home"
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded"
          >
            <Logo size="sm" showText />
          </Link>

          {/* Desktop Navigation Links - HexaHome / Smytten style */}
          <nav
            aria-label="Desktop Navigation"
            className="hidden md:flex items-center gap-1"
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
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors select-none",
                    isActive
                      ? "bg-slate-900 text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action: GharSure Coins & Profile */}
          <div className="flex items-center gap-2.5">
            {/* GharSure Coins Badge */}
            <Link
              href="/rewards"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-300 bg-white text-slate-800 transition-colors text-xs select-none"
              title="GharSure Coins"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold font-mono">
                {coins.toLocaleString()}
              </span>
              <span className="text-slate-500 hidden sm:inline text-[11px]">
                Coins
              </span>
            </Link>

            {/* Profile Avatar & Name */}
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md border transition-colors select-none text-xs",
                pathname === "/profile"
                  ? "border-slate-900 bg-slate-50 text-slate-900 font-semibold"
                  : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
              )}
              title="My Account & Profile"
              aria-label="My Account & Profile"
            >
              <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                {fullName ? fullName[0]?.toUpperCase() : "U"}
              </div>
              <span className="max-w-[110px] truncate hidden sm:inline">
                {fullName || "Profile"}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
