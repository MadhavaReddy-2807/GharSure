import React from "react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getCustomerById } from "@/lib/supabase/db";
import { listAvailableSurveysForCustomer } from "@/lib/survey-db";
import {
  Coins,
  ClipboardList,
  Clock,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const session = await getCurrentSession();
  const customer = session ? await getCustomerById(session.customerId) : null;
  const balance = customer?.reward_coins ?? 0;

  let allSurveys: any[] = [];
  if (session?.customerId) {
    try {
      allSurveys = await listAvailableSurveysForCustomer(session.customerId);
    } catch {
      allSurveys = [];
    }
  }

  // Two dedicated sections: Active and Completed
  const activeSurveys = allSurveys.filter(
    (s) => s.userStatus === "AVAILABLE" || s.userStatus === "IN_PROGRESS" || s.userStatus === "STARTED"
  );
  const completedSurveys = allSurveys.filter((s) => s.userStatus === "COMPLETED");

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-16">
      {/* Header with Balance */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-brand-purple bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200 uppercase tracking-wider">
              Community Rewards
            </span>
            <span className="text-xs text-slate-400 font-medium">Earn & Redeem</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Surveys & Reward Coins
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Share household feedback and community telemetry to earn reward coins for verified home trial kits.
          </p>
        </div>

        {/* Balance Card with Store Callout */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 sm:px-4 sm:py-3 rounded-xl self-start sm:self-center">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Your Coin Balance
            </div>
            <div className="text-base font-bold text-slate-900 font-mono leading-tight">
              {balance.toLocaleString()} <span className="text-xs font-normal text-slate-500">Coins</span>
            </div>
          </div>

          <Link
            href="/store"
            className="ml-2 px-3 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Store</span>
          </Link>
        </div>
      </div>

      {/* Store Trial Kits Callout Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Redeem Coins in the GharSure Store
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5">
              All zero-cost trial kits (Water Hardness Test Strips, Citric Descalers, Mineral Cartridges) are now available in the Store.
            </p>
          </div>
        </div>

        <Link
          href="/store"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <span>Explore Trial Kits</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* SECTION 1: ACTIVE SURVEYS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span>Active Surveys</span>
              <span className="text-[10px] font-bold text-brand-purple bg-purple-50 px-2 py-0.2 rounded border border-purple-200">
                {activeSurveys.length} Available
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Take open household research surveys to earn instant GharSure Coins.
            </p>
          </div>
        </div>

        {activeSurveys.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2 border border-slate-100">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No Open Surveys Right Now</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
              You have completed all currently active research surveys. Check back soon for new studies!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {activeSurveys.map((survey) => {
              const isInProgress = survey.userStatus === "IN_PROGRESS" || survey.userStatus === "STARTED";

              return (
                <div
                  key={survey.id}
                  className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs group"
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
                            <span>Adaptive</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <Coins className="w-3 h-3 text-amber-600" />
                        <span>+{survey.rewardCoins} Coins</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug group-hover:text-brand-purple transition-colors">
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

                    <Link
                      href={`/surveys/${survey.id}`}
                      className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors shadow-xs ${
                        isInProgress
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-brand-purple hover:bg-brand-purple/90"
                      }`}
                    >
                      <span>{isInProgress ? "Resume Survey" : "Start Survey"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: COMPLETED SURVEYS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span>Completed Surveys</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                {completedSurveys.length} Finished
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical surveys you have submitted with reward coins issued to your account.
            </p>
          </div>
        </div>

        {completedSurveys.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No Completed Surveys Yet</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
              Complete your first survey in the active section above to begin accumulating reward coins!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {completedSurveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-xl p-4 sm:p-5 border border-emerald-200/80 flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      {survey.category || "General"}
                    </span>

                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      <Coins className="w-3 h-3 text-emerald-600" />
                      <span>+{survey.rewardCoins} Coins Earned</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
                    {survey.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {survey.description || "Survey responses verified and recorded."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Verified & Rewarded</span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">Response Submitted</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
