"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./logo";
import { Home, Award, Users, ShoppingBag, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  fullName?: string | null;
}

const desktopNavItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Rewards", href: "/rewards", icon: Award },
  { name: "Refer & Win", href: "/refer", icon: Users },
  { name: "Store", href: "/store", icon: ShoppingBag },
];

export function AppHeader({ fullName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            href="/home"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange rounded-lg"
          >
            <Logo size="sm" showText />
          </Link>

          {/* Desktop Navigation Links */}
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
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors select-none",
                    isActive
                      ? "bg-orange-50 text-brand-orange"
                      : "text-slate-600 hover:text-brand-navy hover:bg-slate-100"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action: User Avatar (links to Profile) & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-brand-orange/30 transition-all select-none"
              title="My Profile"
              aria-label="My Profile"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 text-brand-orange flex items-center justify-center font-bold text-xs border border-orange-200">
                {fullName ? fullName[0]?.toUpperCase() : "U"}
              </div>
              {fullName && (
                <span className="hidden sm:inline text-xs font-semibold text-slate-700 max-w-[120px] truncate">
                  {fullName}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Log out"
              title="Log out"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
