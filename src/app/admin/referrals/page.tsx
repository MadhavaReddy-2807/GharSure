"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Share2,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Check,
  X,
  Users,
} from "lucide-react";

interface Referral {
  id: string;
  referrer_id: string;
  referrer_customer_id: string;
  referrer_name: string | null;
  referrer_phone: string;
  referee_id: string;
  referee_customer_id: string;
  referee_name: string | null;
  referee_phone: string;
  referral_code: string;
  status: "PENDING" | "QUALIFIED" | "REWARDED" | "REJECTED";
  reward_coins: number;
  created_at: string;
  qualified_at: string | null;
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  REWARDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchReferrals = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/referrals");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load referrals");
      setReferrals(data.referrals);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Status update failed");
      setSuccess(`Referral status marked as ${status}.`);
      fetchReferrals();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Referral Program & Attributions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track inviter-invitee pairings, verify conversion conditions, and prevent duplicate self-referrals.
          </p>
        </div>

        <button
          onClick={() => fetchReferrals()}
          className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto"
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Referral Code</th>
                <th className="px-5 py-3.5">Inviter (Referrer)</th>
                <th className="px-5 py-3.5">Invitee (New User)</th>
                <th className="px-5 py-3.5">Bonus Coins</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Attributed Date</th>
                <th className="px-5 py-3.5 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading referral attributions...</span>
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No referral claims recorded yet.
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">
                      {r.referral_code}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900 font-mono">{r.referrer_customer_id}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{r.referrer_name || r.referrer_phone}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900 font-mono">{r.referee_customer_id}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{r.referee_name || r.referee_phone}</div>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-amber-600">
                      +{r.reward_coins} Coins
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          STATUS_BADGES[r.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(r.id, "QUALIFIED")}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] transition-colors"
                            >
                              Qualify
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(r.id, "REJECTED")}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium text-[11px] transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === "QUALIFIED" && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, "REWARDED")}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors"
                          >
                            Mark Rewarded
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
