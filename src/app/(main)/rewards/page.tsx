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
  ChevronRight,
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

  // Active and Completed surveys
  const activeSurveys = allSurveys.filter(
    (s) => s.userStatus === "AVAILABLE" || s.userStatus === "IN_PROGRESS" || s.userStatus === "STARTED"
  );
  const completedSurveys = allSurveys.filter((s) => s.userStatus === "COMPLETED");

  const potentialCoins = activeSurveys.reduce((sum, s) => sum + (s.rewardCoins || 0), 0);

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-12">
      {/* 1. HEADER & BALANCE OVERVIEW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Surveys & Rewards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Participate in research surveys to earn reward coins for doorstep trial kits.
          </p>
        </div>

        {/* Clean Balance & Action */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Available Balance
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {balance.toLocaleString()} <span className="text-xs font-normal text-slate-500">Coins</span>
            </div>
          </div>
          <Link
            href="/store"
            className="px-3.5 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Store</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS OVERVIEW STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Wallet Balance</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            {balance.toLocaleString()} <span className="text-xs text-slate-500 font-normal">Coins</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Open Studies</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            {activeSurveys.length} <span className="text-xs text-slate-500 font-normal">(+{potentialCoins} Coins available)</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Completed Surveys</div>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            {completedSurveys.length} <span className="text-xs text-slate-500 font-normal">Verified</span>
          </div>
        </div>
      </div>

      {/* 3. STORE TRIAL CALLOUT BANNER */}
      <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            Redeem Coins in the Store for Free Doorstep Trials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Zero monetary charge. Household essentials, care products, and lifestyle trials are delivered to your door.
          </p>
        </div>

        <Link
          href="/store"
          className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors shrink-0"
        >
          <span>Browse Trials</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 4. SECTION 1: ACTIVE SURVEYS */}
      <section aria-labelledby="active-surveys-heading" className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <h2 id="active-surveys-heading" className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Active Surveys ({activeSurveys.length})
          </h2>
          <span className="text-xs text-slate-500">Reward coins credit immediately upon completion</span>
        </div>

        {activeSurveys.length === 0 ? (
          <div className="p-8 rounded-lg border border-slate-200 bg-white text-center">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-800">No Open Surveys</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              You have completed all active studies. Check back soon for new research campaigns.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeSurveys.map((survey) => {
              const isInProgress = survey.userStatus === "IN_PROGRESS" || survey.userStatus === "STARTED";

              return (
                <div
                  key={survey.id}
                  className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        {survey.category || "General"}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-700">
                        +{survey.rewardCoins} Coins
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {survey.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {survey.description || "Help improve household solutions and everyday essentials."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>~{survey.estimatedDurationMin || 3} mins</span>
                    </div>

                    <Link
                      href={`/surveys/${survey.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      <span>{isInProgress ? "Resume" : "Start"}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. SECTION 2: COMPLETED SURVEYS LEDGER */}
      <section aria-labelledby="completed-surveys-heading" className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <h2 id="completed-surveys-heading" className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Completed Surveys ({completedSurveys.length})
          </h2>
        </div>

        {completedSurveys.length === 0 ? (
          <div className="p-8 rounded-lg border border-slate-200 bg-white text-center">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-800">No Completed Surveys Yet</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete your first survey above to accumulate reward coins.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
            {completedSurveys.map((survey) => (
              <div key={survey.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {survey.category || "General"}
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{survey.title}</h3>
                </div>

                <div className="font-mono font-bold text-amber-700 sm:text-right">
                  +{survey.rewardCoins} Coins Earned
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
