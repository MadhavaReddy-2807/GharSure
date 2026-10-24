import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import {
  Gift,
  Coins,
  Inbox,
  ClipboardList,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  GitBranch,
} from "lucide-react";

export default async function RewardsPage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;
  const balance = customer?.reward_coins ?? 0;

  let trials: any[] = [];
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      trials = await sql`
        SELECT id, title, description, coin_cost, partner_name
        FROM trial_campaigns
        WHERE status = 'ACTIVE'
        ORDER BY created_at DESC;
      `;
    } catch {
      trials = [];
    }
  }

  let surveys: any[] = [];
  if (session?.customerId) {
    try {
      surveys = await listAvailableSurveysForCustomer(session.customerId);
    } catch {
      surveys = [];
    }
  }

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      {/* Header with Balance */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
            Rewards & Trials
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Earn coins by participating in community research surveys and redeem for verified trial kits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl self-start sm:self-center">
          <Coins className="w-5 h-5 text-brand-orange shrink-0" />
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Your Coin Balance</div>
            <div className="text-lg font-bold text-brand-navy leading-none font-mono">
              {balance.toLocaleString()} Coins
            </div>
          </div>
        </div>
      </div>

      {/* Earn Coins with Surveys Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider">
              Earn Coins: Community & Research Surveys
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Share your feedback on home maintenance and appliances to earn instant reward coins.
            </p>
          </div>
        </div>

        {surveys.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Active Surveys Right Now
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              New research surveys and home diagnostics are published regularly. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {surveys.map((survey) => {
              const isCompleted = survey.userStatus === "COMPLETED";
              const isInProgress = survey.userStatus === "IN_PROGRESS";
              const isDisqualified = survey.userStatus === "DISQUALIFIED";

              return (
                <div
                  key={survey.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {survey.category || "General"}
                        </span>
                        {survey.surveyType === "DECISION_BASED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                            <GitBranch className="w-3 h-3" />
                            <span>Smart Branch</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded-full">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{survey.rewardCoins} Coins</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-brand-navy mb-1.5 leading-snug">
                      {survey.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {survey.description || "Help improve home care solutions by completing this survey."}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>~{survey.estimatedDurationMin || 5} mins</span>
                    </div>

                    {isCompleted ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Completed · Earned</span>
                      </div>
                    ) : isDisqualified ? (
                      <span className="text-xs text-slate-400 font-medium px-3 py-1.5 bg-slate-50 rounded-xl">
                        Closed for your profile
                      </span>
                    ) : isInProgress ? (
                      <Link
                        href={`/surveys/${survey.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <span>Resume Survey</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Link
                        href={`/surveys/${survey.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange-600 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <span>Start Survey</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Trials Section */}
      <div>
        <div className="mb-3 px-1">
          <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider">
            Available Trial Kits & Redemptions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Use your earned coins to claim free product trials delivered to your doorstep.
          </p>
        </div>

        {trials.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Active Trial Kits Available
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              New zero-cost product trials and sample kits are unlocked as community surveys reach quota.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {trials.map((trial) => (
              <div
                key={trial.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Gift className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        trial.coin_cost === 0
                          ? "text-emerald-700 bg-emerald-50"
                          : "text-brand-navy bg-slate-100"
                      }`}
                    >
                      {trial.coin_cost === 0 ? "₹0 Free Trial" : `${trial.coin_cost} Coins`}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-brand-navy mb-1">
                    {trial.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {trial.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {trial.partner_name ? `Partner: ${trial.partner_name}` : "Free Delivery"}
                  </span>
                  <button className="px-4 py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold hover:bg-brand-orange-600 transition-colors">
                    {trial.coin_cost === 0 ? "Claim Trial" : `Redeem ${trial.coin_cost} Coins`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
