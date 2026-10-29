import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerReferralStats } from "@/lib/referral";
import { ReferralCodeCard } from "@/components/referral-code-card";
import { Users, Award, ShieldCheck, Gift, Sparkles, CheckCircle2 } from "lucide-react";

export default async function ReferPage() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const stats = await getCustomerReferralStats(session.customerId);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-16">
      {/* 1. Page Header with Metrics Strip */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-7 border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-brand-purple bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">
                Neighbor Referral Program
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Refer & Earn Together
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Invite residents in your apartment society to build a shared water telemetry map and earn instant bonus coins.
            </p>
          </div>
        </div>

        {/* Real-Time Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Total Invited</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {stats.totalReferrals}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Homeowners</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
              {stats.rewardedReferrals}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Bonus Coins Earned</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 font-mono mt-1">
              +{stats.totalCoinsEarned.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Code & Share Card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ReferralCodeCard
            code={stats.referralCode}
            bonusCoins={stats.campaignBonusCoins}
          />

          {/* Milestone Tier Rewards */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Referral Milestones & Tiers</span>
              </h3>
              <span className="text-xs text-slate-400">Unlock at each step</span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-brand-purple flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">First Resident Verified</h4>
                    <p className="text-[11px] text-slate-500">+{stats.campaignBonusCoins} Bonus Coins credited instantly</p>
                  </div>
                </div>
                {stats.rewardedReferrals >= 1 ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Unlocked
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">Next</span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">5 Society Neighbors</h4>
                    <p className="text-[11px] text-slate-500">Free Digital Water Hardness Tester kit delivered</p>
                  </div>
                </div>
                {stats.rewardedReferrals >= 5 ? (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Unlocked
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">{Math.max(0, 5 - stats.rewardedReferrals)} to go</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: How it Works & Privacy (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                How Society Referrals Work
              </h2>

              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-50 text-brand-purple text-xs font-bold shrink-0 mt-0.5 border border-purple-200">
                    1
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Share Your Invite Link</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Send your link to residents in your apartment society WhatsApp or community groups.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-50 text-brand-purple text-xs font-bold shrink-0 mt-0.5 border border-purple-200">
                    2
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Neighbor Verifies Their Home</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      When they log in and verify their water setup, they receive +{stats.campaignRefereeBonusCoins} welcome coins.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-50 text-brand-purple text-xs font-bold shrink-0 mt-0.5 border border-purple-200">
                    3
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">Instant Wallet Credit</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      You receive +{stats.campaignBonusCoins} bonus coins credited immediately to redeem for Store trial kits.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 mt-6">
              Referrals are strictly private. No personal phone numbers or identities are revealed to anyone.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Referral Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Referred Neighbors
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Status of residents who joined using your invite link
          </p>
        </div>

        {stats.attributions.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No neighbors have joined with your link yet. Share your code above to start earning bonus coins together.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Neighbor</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Coins</th>
                  <th className="py-3 px-5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.attributions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-5 font-medium text-slate-900">
                      {item.refereeName}
                    </td>
                    <td className="py-3 px-5">
                      {item.status === "REWARDED" ? (
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Rewarded
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-5 font-mono font-bold text-amber-700">
                      +{item.rewardCoins}
                    </td>
                    <td className="py-3 px-5 text-right text-slate-400 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
