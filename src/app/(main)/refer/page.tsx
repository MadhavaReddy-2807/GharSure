import React from "react";
import { getCurrentSession } from "@/lib/session";
import { getCustomerReferralStats } from "@/lib/referral";
import { ReferralCodeCard } from "@/components/referral-code-card";
import { Users, Award, ShieldCheck } from "lucide-react";

export default async function ReferPage() {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const stats = await getCustomerReferralStats(session.customerId);

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Refer Neighbors
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
          Invite residents in your apartment society to unlock collective water insights and earn reward coins.
        </p>

        {/* Real-Time Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Users className="w-3 h-3 text-slate-400" />
              <span>Total Invited</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {stats.totalReferrals}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Verified</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-700 mt-0.5">
              {stats.rewardedReferrals}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center gap-1 text-[11px] text-slate-600">
              <Award className="w-3 h-3 text-amber-600" />
              <span>Coins Earned</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-amber-700 mt-0.5">
              +{stats.totalCoinsEarned}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Left Column: Code & Share */}
        <ReferralCodeCard
          code={stats.referralCode}
          bonusCoins={stats.campaignBonusCoins}
        />

        {/* Right Column: How it Works */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              How Referrals Work
            </h2>

            <ol className="space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Share Your Code</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Send your invite link to neighbors or apartment resident WhatsApp groups.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Neighbor Verifies</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    When they verify their number, they receive +{stats.campaignRefereeBonusCoins} welcome coins.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Earn Bonus Coins</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    You receive +{stats.campaignBonusCoins} bonus coins credited immediately to your wallet.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 mt-4">
            Referrals are strictly private. No personal phone numbers are shared.
          </div>
        </div>
      </div>

      {/* Referral Activity Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Referred Neighbors
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Status of residents who joined using your invite link
          </p>
        </div>

        {stats.attributions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No neighbors have joined with your link yet. Share your code to start earning coins together.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
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
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
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
      </div>
    </div>
  );
}
