import React from "react";
import { getCurrentSession } from "@/lib/session";
import { Users, Share2, Coins, ShieldCheck } from "lucide-react";

export default async function ReferPage() {
  const session = await getCurrentSession();
  const referralCode = session?.readableId || "GHARSURE";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-brand-navy">Refer & Win</h1>
        <p className="text-xs text-slate-600 mt-1">
          Invite neighbors in your apartment society to build hyper-local water intelligence.
        </p>

        {/* Referral Card */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Your Unique Referral Code
          </span>
          <div className="text-2xl font-mono font-extrabold text-brand-navy tracking-widest my-2 select-all">
            {referralCode}
          </div>
          <button className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand-orange text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-brand-orange-600 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Referral Link</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-brand-navy">How it works</h2>
        <div className="flex items-start gap-3 text-xs text-slate-600">
          <Coins className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
          <span>Earn <strong>150 GharSure Coins</strong> for every neighbor who verifies their phone.</span>
        </div>
        <div className="flex items-start gap-3 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Unlock detailed water contamination reports for your entire block.</span>
        </div>
      </div>
    </div>
  );
}
