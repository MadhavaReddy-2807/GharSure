import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerReferralStats } from "@/lib/referral";
import { ReferralCodeCard } from "@/components/referral-code-card";
import { Users, Award, Clock, ArrowRight, ShieldCheck } from "lucide-react";

export default async function ReferPage() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const stats = await getCustomerReferralStats(session.customerId);

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
          Refer Neighbors & Earn
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Invite residents in your society or apartment building to unlock collaborative water reports and earn rewards.
        </p>

        {/* Real-Time Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Total Invited</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {stats.totalReferrals}
            </div>
          </div>

          <div className="bg-emerald-50/50 rounded-xl p-3 sm:p-4 border border-emerald-100/60">
            <div className="flex items-center gap-1.5 text-xs text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rewarded</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
              {stats.rewardedReferrals}
            </div>
          </div>

          <div className="bg-amber-50/50 rounded-xl p-3 sm:p-4 border border-amber-100/60">
            <div className="flex items-center gap-1.5 text-xs text-amber-700">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Coins Earned</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">
              +{stats.totalCoinsEarned}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Code & Share */}
        <ReferralCodeCard
          code={stats.referralCode}
          bonusCoins={stats.campaignBonusCoins}
        />

        {/* Right Column: How it Works */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-brand-navy uppercase tracking-wider mb-4">
              How Referral Works
            </h2>

            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-brand-navy">Share Your Code</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Send your invite link to neighbors or apartment resident WhatsApp groups.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-brand-navy">Neighbor Verifies</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    When they verify their mobile number and complete onboarding, they instantly receive +{stats.campaignRefereeBonusCoins} welcome coins.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-brand-navy">Earn Bonus Coins</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    You receive +{stats.campaignBonusCoins} bonus coins credited immediately to your wallet.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="pt-6 border-t border-slate-100 text-xs text-slate-400">
            Referrals are strictly private and no personal contact details are shared.
          </div>
        </div>
      </div>

      {/* Referral Activity Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Your Referral Activity
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status of neighbors who used your invite link
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {stats.totalReferrals} {stats.totalReferrals === 1 ? "Invite" : "Invites"}
          </span>
        </div>

        {stats.attributions.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No referral activity yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Share your invite link with your building neighbors to start unlocking free trial kits together.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Neighbor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reward</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.attributions.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.refereeName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{item.refereeCustomerId}</div>
                    </td>
                    <td className="py-3 px-4">
                      {item.status === "REWARDED" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          Rewarded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Pending Onboarding
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-600">
                      +{item.rewardCoins} Coins
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
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
