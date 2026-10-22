import React from "react";
import { getCurrentSession } from "@/lib/session";
import { Gift, Coins, CheckCircle2 } from "lucide-react";

export default async function RewardsPage() {
  const session = await getCurrentSession();

  return (
    <div className="space-y-6 w-full">
      {/* Header with Balance */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
            Rewards & Trials
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Redeem coins for verified home care and water quality trial kits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl self-start sm:self-center">
          <Coins className="w-5 h-5 text-brand-orange shrink-0" />
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Balance</div>
            <div className="text-lg font-bold text-brand-navy leading-none">100 Coins</div>
          </div>
        </div>
      </div>

      {/* Available Trials */}
      <div>
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider mb-3 px-1">
          Available Trials
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Item 1 */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                  ₹0 Free Trial
                </span>
              </div>
              <h3 className="text-base font-bold text-brand-navy mb-1">
                Eco Washing Machine Descaler
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Full-size trial kit formulated for Indian municipal and borewell water. Dissolves calcium scaling in washing drums.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Free Delivery</span>
              <button className="px-4 py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold hover:bg-brand-orange-600 transition-colors">
                Claim Trial
              </button>
            </div>
          </div>

          {/* Item 2 */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-brand-navy bg-slate-100 px-2.5 py-1 rounded-md">
                  50 Coins
                </span>
              </div>
              <h3 className="text-base font-bold text-brand-navy mb-1">
                Anti-Clog Tap Aerator
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Solid brass aeration nozzle that resists hard-water calcium crusting and reduces splashing.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Free Delivery</span>
              <button className="px-4 py-2 rounded-xl bg-brand-navy text-white text-xs font-semibold hover:bg-brand-navy-600 transition-colors">
                Redeem 50 Coins
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
