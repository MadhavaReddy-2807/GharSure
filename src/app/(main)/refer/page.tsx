import React from "react";
import { getCurrentSession } from "@/lib/session";
import { ReferralCodeCard } from "@/components/referral-code-card";

export default async function ReferPage() {
  const session = await getCurrentSession();
  const referralCode = session?.readableId || "GHARSURE";

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
          Refer Neighbors
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Invite residents in your society or apartment to unlock collaborative water reports and earn rewards.
        </p>
      </div>

      {/* 2-Column Responsive Layout on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Code & Share */}
        <ReferralCodeCard code={referralCode} />

        {/* Right Column: How it Works */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider mb-4">
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
                    Send your invite link to neighbors or apartment resident groups.
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
                    When they sign up with WhatsApp, they instantly receive 100 welcome coins.
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
                    You receive 150 coins per verified neighbor to unlock free trial kits.
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
    </div>
  );
}
