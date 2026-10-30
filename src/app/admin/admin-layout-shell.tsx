"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  ClipboardList,
  Coins,
  PackageOpen,
  ShoppingBag,
  Share2,
  Building2,
  BellRing,
  Headphones,
  BarChart3,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { AdminRole, AdminPermission } from "@/lib/admin-auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: AdminPermission;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users, permission: "users:read" },
  { label: "Access & Roles", href: "/admin/access", icon: ShieldAlert, permission: "access:manage" },
  { label: "Surveys", href: "/admin/surveys", icon: ClipboardList, permission: "surveys:read" },
  { label: "Quick Polls", href: "/admin/rewards?tab=POLLS", icon: Vote, permission: "polls:read" },
  { label: "Rewards & Coins", href: "/admin/rewards", icon: Coins, permission: "rewards:read" },
  { label: "Content & Products", href: "/admin/content", icon: PackageOpen, permission: "content:read" },
  { label: "Store & Trials", href: "/admin/store", icon: ShoppingBag, permission: "store:read" },
  { label: "Referrals", href: "/admin/referrals", icon: Share2, permission: "referrals:read" },
  { label: "Buildings & Intel", href: "/admin/buildings", icon: Building2, permission: "buildings:read" },
  { label: "Communications", href: "/admin/communications", icon: BellRing, permission: "communications:read" },
  { label: "Support Tickets", href: "/admin/support", icon: Headphones, permission: "support:read" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, permission: "analytics:read" },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: History, permission: "audit:read" },
  { label: "Settings", href: "/admin/settings", icon: Settings, permission: "settings:read" },
];

const ROLE_BADGE_STYLES: Record<AdminRole, string> = {
  SUPER_ADMIN: "bg-red-50 text-red-700 border-red-200",
  OPERATIONS_ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
  PRODUCT_MANAGER: "bg-indigo-50 text-indigo-700 border-indigo-200",
  REWARDS_MANAGER: "bg-amber-50 text-amber-700 border-amber-200",
  REVIEWER: "bg-teal-50 text-teal-700 border-teal-200",
  CONTENT_MANAGER: "bg-purple-50 text-purple-700 border-purple-200",
  SUPPORT_ADMIN: "bg-amber-50 text-amber-700 border-amber-200",
  ANALYST: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function AdminLayoutShell({
  children,
  admin,
  permissions,
}: {
  children: React.ReactNode;
  admin: {
    adminId: string;
    email: string;
    fullName: string;
    role: AdminRole;
  };
  permissions: AdminPermission[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filter nav items by permissions
  const accessibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return permissions.includes(item.permission);
  });

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center border border-orange-100">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 tracking-tight">
            Ghar<span className="text-brand-orange">Sure</span> Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar / Mobile Drawer */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand & Nav */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center border border-orange-100 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-900 tracking-tight block leading-none">
                  Ghar<span className="text-brand-orange">Sure</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  ADMIN CONSOLE
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {accessibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-brand-purple text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Admin User Profile footer in sidebar */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {admin.fullName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{admin.email}</p>
              </div>
              <span
                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  ROLE_BADGE_STYLES[admin.role] || "bg-slate-100 text-slate-700"
                }`}
              >
                {admin.role.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
              <Link
                href="/home"
                target="_blank"
                className="flex-1 flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"
              >
                <span>View App</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center justify-center gap-1 py-1 px-2 text-[11px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-all disabled:opacity-50"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Header bar */}
        <header className="hidden md:flex bg-white border-b border-slate-200/80 px-6 py-3 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="font-semibold text-slate-900 capitalize">
              {pathname === "/admin"
                ? "Overview"
                : pathname.replace("/admin/", "").replace("-", " ")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Signed in as <strong className="text-slate-800">{admin.email}</strong>
            </span>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                ROLE_BADGE_STYLES[admin.role] || "bg-slate-100 text-slate-700"
              }`}
            >
              {admin.role.replace("_", " ")}
            </span>
          </div>
        </header>

        {/* Dynamic page content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
