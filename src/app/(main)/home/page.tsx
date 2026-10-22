import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { Droplets, Wrench, Gift, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;

  const displayName = customer?.display_name || customer?.full_name?.split(" ")[0] || "Homeowner";
  const city = customer?.city || "India";

  return (
    <div className="space-y-6 w-full">
      {/* Overview Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
              Welcome, {displayName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Household intelligence and water reports for {city}.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <MapPin className="w-3 h-3 text-brand-orange" />
              <span>{city}</span>
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Verified Phone: <strong className="text-slate-800 font-mono">{customer?.phone_e164}</strong></span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified Resident
          </span>
        </div>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider mb-3 px-1">
          Household Overview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Water Quality */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                  Live
                </span>
              </div>
              <h3 className="text-base font-bold text-brand-navy mb-1">
                Water Quality Index
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Local TDS and hardness telemetry for your area in {city}.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Updated today
            </div>
          </div>

          {/* Card 2: Appliance Tracker */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  0 Registered
                </span>
              </div>
              <h3 className="text-base font-bold text-brand-navy mb-1">
                Appliance Health
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Register appliances to track maintenance schedules and warranty renewals.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-brand-orange cursor-pointer hover:underline">
                + Add Appliance
              </span>
            </div>
          </div>

          {/* Card 3: Free Trials Promotion */}
          <Link
            href="/rewards"
            className="bg-brand-navy text-white rounded-2xl p-5 sm:p-6 shadow-sm hover:bg-brand-navy-600 transition-colors flex flex-col justify-between md:col-span-2 lg:col-span-1"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-brand-orange flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-brand-orange text-white">
                  1 Available
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Product Trials
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Claim full-size washing machine descaler and home testing kits for ₹0.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-brand-orange font-semibold">
              <span>View Rewards</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
