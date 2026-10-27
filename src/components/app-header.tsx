"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./logo";
import { Home, Award, Users, ShoppingBag, LogOut, Plus } from "lucide-react";
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
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
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

          {/* Right Action: User Avatar (links to Profile) & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/profile"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-brand-purple text-xs font-bold border border-purple-200 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ask / Post</span>
            </Link>

            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border transition-all select-none",
                pathname === "/profile"
                  ? "border-brand-purple bg-purple-50/50 ring-2 ring-brand-purple/20"
                  : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
              )}
              title="My Profile"
              aria-label="My Profile"
            >
              <div className="w-7 h-7 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                {fullName ? fullName[0]?.toUpperCase() : "U"}
              </div>
              <span className="text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                {fullName || "Profile"}
              </span>
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Log out"
              title="Log out"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
