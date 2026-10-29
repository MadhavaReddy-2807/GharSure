import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerReferralStats } from "@/lib/referral";
import { ReferralCodeCard } from "@/components/referral-code-card";
import { Users, Award, ShieldCheck, CheckCircle2 } from "lucide-react";

export default async function ReferPage() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const stats = await getCustomerReferralStats(session.customerId);

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Refer & Win
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Invite neighbors to join GharSure and earn bonus coins for household essentials.
          </p>
        </div>
      </div>

      {/* 2. STATS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            <span>Total Invited</span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1">
            {stats.totalReferrals}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Homeowners</span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
            {stats.rewardedReferrals}
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Bonus Coins Earned</span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-700 mt-1">
            +{stats.totalCoinsEarned.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 3. 2-COLUMN REFERRAL CODE & DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Left Column: Code & Share */}
        <ReferralCodeCard
          code={stats.referralCode}
          bonusCoins={stats.campaignBonusCoins}
        />

        {/* Right Column: How it Works */}
        <div className="p-5 rounded-lg border border-slate-200 bg-white space-y-4 text-xs">
          <h2 className="font-bold uppercase tracking-wider text-slate-700 text-xs">
            How Referrals Work
          </h2>

          <div className="space-y-3 text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <span className="font-semibold text-slate-900 block">Share Your Code</span>
                Send your link to residents in your apartment WhatsApp group or building chat.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <span className="font-semibold text-slate-900 block">Neighbor Verifies</span>
                When they sign in and register, they receive +{stats.campaignRefereeBonusCoins} welcome coins.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <span className="font-semibold text-slate-900 block">Instant Wallet Credit</span>
                You receive +{stats.campaignBonusCoins} bonus coins credited immediately for Store trials.
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Referrals are strictly private. Personal phone numbers and apartment numbers are never shared.
          </div>
        </div>
      </div>

      {/* 4. REFERRED RESIDENTS TABLE */}
      <section aria-labelledby="referrals-table-heading" className="space-y-3">
        <h2 id="referrals-table-heading" className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200">
          Referred Neighbors ({stats.attributions.length})
        </h2>

        {stats.attributions.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-slate-200 bg-white text-xs text-slate-400">
            No neighbors have joined with your code yet. Share your code above to begin earning coins.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Neighbor</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Coins</th>
                  <th className="py-2.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.attributions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {item.refereeName}
                    </td>
                    <td className="py-2.5 px-4">
                      {item.status === "REWARDED" ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Rewarded
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-amber-700">
                      +{item.rewardCoins}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
