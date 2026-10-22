"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  RefreshCw,
  Loader2,
  TrendingUp,
  MapPin,
  ClipboardList,
  Coins,
  Download,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load analytics");
      setData(json.analytics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExportCsv = () => {
    window.open("/api/admin/users/export", "_blank");
  };

  if (isLoading && !data) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
        <span>Aggregating real database records...</span>
      </div>
    );
  }

  const onboarding = data?.onboarding || { total: 0, completed: 0, pending: 0 };
  const conversionRate = onboarding.total > 0 ? Math.round((onboarding.completed / onboarding.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Platform Analytics & Aggregates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative cohort statistics, onboarding funnels, and reward liabilities directly from PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Permitted Dataset</span>
          </button>
          <button
            onClick={() => fetchAnalytics()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Primary Funnel Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Onboarding & Verification Funnel
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phone verified registrations vs completed name and location setup
            </p>
          </div>
          <span className="text-2xl font-bold text-brand-orange font-mono">
            {conversionRate}%
          </span>
        </div>

        {/* Funnel Progress */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${conversionRate}%` }}
            className="bg-brand-orange h-full rounded-full transition-all"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Phone Verified</span>
            <span className="text-lg font-bold text-slate-900 font-mono">{onboarding.total}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Completed Onboarding</span>
            <span className="text-lg font-bold text-emerald-800 font-mono">{onboarding.completed}</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-[10px] text-amber-700 uppercase font-semibold block">Pending Household Info</span>
            <span className="text-lg font-bold text-amber-800 font-mono">{onboarding.pending}</span>
          </div>
        </div>
      </div>

      {/* Grid: City Breakdown & Coin Emission Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Geographic Distribution (Cities)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {data?.cityBreakdown?.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No city records available.</div>
            ) : (
              data?.cityBreakdown?.map((c: any) => (
                <div key={c.city} className="px-5 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{c.city}</span>
                  <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {c.count} residents
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reward Ledger Emission Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Coin Ledger Emission & Redemptions
            </h3>
          </div>
          <div className="divide-y divide-slate-100 text-xs font-mono">
            {data?.rewardsByType?.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-sans">No transactions recorded.</div>
            ) : (
              data?.rewardsByType?.map((r: any) => (
                <div key={r.type} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 block font-sans text-xs">{r.type}</span>
                    <span className="text-[10px] text-slate-400">{r.count} transaction(s)</span>
                  </div>
                  <span
                    className={`font-bold text-xs ${
                      r.total_amount >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {r.total_amount >= 0 ? `+${r.total_amount}` : r.total_amount} Coins
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Survey Performance Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-brand-orange" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Survey Response & Qualification Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Survey ID</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Reward</th>
                <th className="px-5 py-3">Total Starts</th>
                <th className="px-5 py-3">Completed Sessions</th>
                <th className="px-5 py-3 text-right">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {data?.surveyStats?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No surveys found.
                  </td>
                </tr>
              ) : (
                data?.surveyStats?.map((s: any) => {
                  const rate = s.total_responses > 0 ? Math.round((s.completed_responses / s.total_responses) * 100) : 0;
                  return (
                    <tr key={s.survey_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-900">{s.survey_id}</td>
                      <td className="px-5 py-3 font-sans font-medium text-slate-900">{s.title}</td>
                      <td className="px-5 py-3 text-amber-600 font-bold">+{s.reward_coins}</td>
                      <td className="px-5 py-3 text-slate-800">{s.total_responses}</td>
                      <td className="px-5 py-3 text-emerald-600 font-bold">{s.completed_responses}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900">{rate}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
