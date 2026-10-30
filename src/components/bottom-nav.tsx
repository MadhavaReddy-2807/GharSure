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
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center py-1 transition-colors select-none min-h-[48px]",
                isActive
                  ? "text-[#2563EB] font-bold"
                  : "text-slate-500 hover:text-slate-800 font-medium"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform",
                  isActive ? "text-[#2563EB] stroke-[2.3] scale-105" : "text-slate-400 stroke-[1.8]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] mt-1 tracking-tight leading-none",
                  isActive ? "font-bold text-[#2563EB]" : "text-slate-500"
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
