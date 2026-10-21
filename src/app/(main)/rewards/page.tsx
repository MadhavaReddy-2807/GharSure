import React from "react";
import { getCurrentSession } from "@/lib/session";
import { Award, Gift, Sparkles, CheckCircle2 } from "lucide-react";

export default async function RewardsPage() {
  const session = await getCurrentSession();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center mx-auto mb-3">
          <Award className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-brand-navy">GharSure Rewards</h1>
        <p className="text-xs text-slate-600 mt-1">
          Complete surveys and household diagnostics to unlock free kits.
        </p>

        {/* Balance */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-orange" />
            <div className="text-left">
              <span className="block text-xs font-semibold text-slate-600">Your Coin Balance</span>
              <span className="text-xl font-extrabold text-brand-navy">100 Coins</span>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-brand-orange border border-orange-200 shadow-2xs">
            Silver Tier
          </span>
        </div>
      </div>

      <h2 className="text-sm font-bold text-brand-navy tracking-wide uppercase px-1">
        Available Zero-Cost Trials
      </h2>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-navy">Washing Machine Descaler</h3>
            <span className="text-xs font-bold text-emerald-600">₹0</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Free sample pack for homes with hard water TDS &gt; 350 ppm.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Eligible for customer {session?.readableId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
