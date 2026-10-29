"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Award, Users, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

// Exactly four primary navigation tabs across GharSure
const navItems = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Rewards", href: "/rewards", icon: Award },
  { name: "Refer & Win", href: "/refer", icon: Users },
  { name: "Store", href: "/store", icon: ShoppingBag },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 h-15">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center py-1 transition-colors select-none",
                isActive
                  ? "text-slate-900 font-semibold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  isActive ? "text-brand-purple stroke-[2.2]" : "text-slate-400 stroke-[1.8]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] mt-1 tracking-tight leading-none",
                  isActive ? "font-bold text-slate-900" : "text-slate-500"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
