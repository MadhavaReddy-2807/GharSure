"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Award, Users, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="max-w-md mx-auto px-2 h-14 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-colors select-none",
                isActive ? "text-brand-orange" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  isActive ? "font-bold text-brand-navy" : "font-medium"
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
