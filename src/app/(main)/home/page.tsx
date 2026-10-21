import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { Droplets, ShieldCheck, Sparkles, Wrench, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const displayName = customer?.display_name || customer?.full_name?.split(" ")[0] || "Homeowner";
  const customerId = customer?.customer_id || session?.readableId || "GH000001";
  const city = customer?.city || "India";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Welcome Hero Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-100 text-xs font-semibold text-brand-orange">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome Bonus: +100 Coins</span>
          </div>

          <div className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {customerId}
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-brand-navy tracking-tight">
          Hello, {displayName}! 👋
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Your household intelligence hub for <span className="font-semibold text-brand-navy">{city}</span>.
        </p>

        {/* Verification Status */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp Verified ({customer?.phone_e164})</span>
          </div>
          <span className="text-slate-400">Status: Active</span>
        </div>
      </div>

      {/* Household Intelligence Feature Teasers */}
      <h2 className="text-sm font-bold text-brand-navy tracking-wide uppercase px-1">
        Your Household Insights
      </h2>

      {/* Card 1: Water Quality */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Droplets className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-navy">Society Water Index</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Monitor municipal & borewell hardness, TDS levels, and purifier filter health in {city}.
          </p>
        </div>
      </div>

      {/* Card 2: Appliance Tracker */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-navy">Appliance Health Map</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              0 Registered
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Register your washing machine, RO filter, or AC to receive genuine service alerts.
          </p>
        </div>
      </div>

      {/* Card 3: Free Trials Promotion */}
      <Link
        href="/rewards"
        className="block bg-brand-navy text-white rounded-2xl p-4 shadow-sm hover:bg-brand-navy-600 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-orange" />
            <h3 className="text-sm font-bold">Zero-Cost Product Trials</h3>
          </div>
          <ArrowRight className="w-4 h-4 text-brand-orange group-hover:translate-x-1 transition-transform" />
        </div>
        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
          Test brand new eco-friendly descaling kits and smart home essentials for ₹0.
        </p>
      </Link>
    </div>
  );
}
