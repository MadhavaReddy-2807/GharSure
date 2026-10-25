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

  // Fallback trials if empty
  if (trials.length === 0) {
    trials = [
      {
        id: "trial-tds-1",
        title: "Water Hardness (TDS) Rapid Test Kit",
        description: "5 calibrated litmus test strips for instant tap water hardness and chlorine detection.",
        coin_cost: 0,
        partner_name: "GharSure Lab",
      },
      {
        id: "trial-descaler-1",
        title: "Eco Descaler Pouch for Washing Machines & Geysers",
        description: "Organic citric acid descaler for scale removal in hard water regions.",
        coin_cost: 100,
        partner_name: "CleanFlow",
      },
    ];
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
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Header with Balance */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Rewards & Trials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete community research surveys to earn reward coins for verified home trial kits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg self-start sm:self-center">
          <Coins className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Coin Balance</div>
            <div className="text-sm font-bold text-slate-900 leading-none font-mono">
              {balance.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Earn Coins with Surveys Section */}
      <div>
        <div className="mb-2.5 px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Surveys
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Share feedback on your household water and appliances to earn instant reward coins.
          </p>
        </div>

        {surveys.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2 border border-slate-100">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              No Active Surveys Right Now
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
              New community surveys are added regularly. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {surveys.map((survey) => {
              const isCompleted = survey.userStatus === "COMPLETED";
              const isInProgress = survey.userStatus === "IN_PROGRESS";
              const isDisqualified = survey.userStatus === "DISQUALIFIED";

              return (
                <div
                  key={survey.id}
                  className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-50 text-brand-purple">
                          {survey.category || "General"}
                        </span>
                        {survey.surveyType === "DECISION_BASED" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                            <GitBranch className="w-3 h-3" />
                            <span>Branching</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <Coins className="w-3 h-3 text-amber-600" />
                        <span>+{survey.rewardCoins} Coins</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
                      {survey.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {survey.description || "Help improve home care solutions by completing this survey."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>~{survey.estimatedDurationMin || 3} mins</span>
                    </div>

                    {isCompleted ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completed</span>
                      </div>
                    ) : isDisqualified ? (
                      <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded">
                        Closed for your profile
                      </span>
                    ) : isInProgress ? (
                      <Link
                        href={`/surveys/${survey.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                      >
                        <span>Resume</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <Link
                        href={`/surveys/${survey.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold transition-colors"
                      >
                        <span>Start</span>
                        <ArrowRight className="w-3 h-3" />
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
        <div className="mb-2.5 px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Available Trial Kits
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Redeem your earned coins for verified home care trial kits delivered to your doorstep.
          </p>
        </div>

        {trials.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2 border border-slate-100">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              No Active Trial Kits Available
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
              New zero-cost product trials will be unlocked soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {trials.map((trial) => (
              <div
                key={trial.id}
                className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Gift className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        trial.coin_cost === 0
                          ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                          : "text-slate-700 bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {trial.coin_cost === 0 ? "₹0 Free Trial" : `${trial.coin_cost} Coins`}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1">
                    {trial.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {trial.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {trial.partner_name ? `${trial.partner_name}` : "Free Delivery"}
                  </span>
                  <button className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple/90 transition-colors">
                    {trial.coin_cost === 0 ? "Claim Trial" : `Redeem (${trial.coin_cost} Coins)`}
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
