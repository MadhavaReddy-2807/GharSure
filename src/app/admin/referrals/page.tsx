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
  Search,
  Filter,
  Settings as SettingsIcon,
  ShieldCheck,
  Award,
  Clock,
  Save,
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
  referrer_reward_coins?: number;
  referee_reward_coins?: number;
  rejection_reason?: string | null;
  created_at: string;
  qualified_at: string | null;
}

interface CampaignSettings {
  is_active: boolean;
  referrer_reward_coins: number;
  referee_reward_coins: number;
  max_referrals_per_customer: number;
  qualification_trigger: string;
}

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-blue-50 text-blue-700 border-blue-200",
  REWARDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Campaign settings modal/panel state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettings>({
    is_active: true,
    referrer_reward_coins: 100,
    referee_reward_coins: 100,
    max_referrals_per_customer: 50,
    qualification_trigger: "PHONE_VERIFIED_AND_ONBOARDED",
  });

  const fetchReferrals = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/referrals?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load referrals");
      setReferrals(data.referrals);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  const fetchCampaignSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (res.ok && data.success && data.settings) {
        const found = data.settings.find((s: any) => s.key === "referral_campaign");
        if (found && found.value) {
          setCampaignSettings({
            is_active: found.value.is_active !== false,
            referrer_reward_coins: Number(found.value.referrer_reward_coins) || 100,
            referee_reward_coins: Number(found.value.referee_reward_coins) || 100,
            max_referrals_per_customer: Number(found.value.max_referrals_per_customer) || 50,
            qualification_trigger: found.value.qualification_trigger || "PHONE_VERIFIED_AND_ONBOARDED",
          });
        }
      }
    } catch {
      // Keep default
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  useEffect(() => {
    fetchCampaignSettings();
  }, [fetchCampaignSettings]);

  const handleUpdateStatus = async (id: string, status: string, rejectionReason?: string) => {
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Status update failed");
      setSuccess(`Referral marked as ${status}. ${status === "REWARDED" ? "Coins credited to ledgers!" : ""}`);
      fetchReferrals();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveCampaignSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "referral_campaign",
          value: campaignSettings,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update campaign rules");
      setSuccess("Referral campaign rules updated successfully.");
      setShowSettings(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Derive summary metrics from real database rows
  const totalAttributions = referrals.length;
  const rewardedCount = referrals.filter((r) => r.status === "REWARDED").length;
  const pendingCount = referrals.filter((r) => r.status === "PENDING" || r.status === "QUALIFIED").length;
  const totalCoinsEmitted = referrals
    .filter((r) => r.status === "REWARDED")
    .reduce((sum, r) => sum + (Number(r.referrer_reward_coins || r.reward_coins || 0) + Number(r.referee_reward_coins || 100)), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Referral Program & Attributions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real inviter-invitee pairings, atomic dual coin ledger rewards, and campaign configuration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Campaign Rules</span>
          </button>

          <button
            onClick={() => fetchReferrals()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Campaign Settings Panel */}
      {showSettings && (
        <form
          onSubmit={handleSaveCampaignSettings}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Referral Campaign Configuration</h2>
              <p className="text-xs text-slate-500">Live authoritative reward parameters for app & backend</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Referrer Reward (Coins)
              </label>
              <input
                type="number"
                min={0}
                max={1000}
                value={campaignSettings.referrer_reward_coins}
                onChange={(e) =>
                  setCampaignSettings({
                    ...campaignSettings,
                    referrer_reward_coins: Number(e.target.value),
                  })
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Referee Reward (Coins)
              </label>
              <input
                type="number"
                min={0}
                max={1000}
                value={campaignSettings.referee_reward_coins}
                onChange={(e) =>
                  setCampaignSettings({
                    ...campaignSettings,
                    referee_reward_coins: Number(e.target.value),
                  })
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Max Referrals Per User
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={campaignSettings.max_referrals_per_customer}
                onChange={(e) =>
                  setCampaignSettings({
                    ...campaignSettings,
                    max_referrals_per_customer: Number(e.target.value),
                  })
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Program Status
              </label>
              <select
                value={campaignSettings.is_active ? "ACTIVE" : "PAUSED"}
                onChange={(e) =>
                  setCampaignSettings({
                    ...campaignSettings,
                    is_active: e.target.value === "ACTIVE",
                  })
                }
                className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 bg-white"
              >
                <option value="ACTIVE">Active (Issuing Rewards)</option>
                <option value="PAUSED">Paused (No New Attributions)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={settingsLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange-600 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{settingsLoading ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Total Attributions</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalAttributions}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rewarded</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{rewardedCount}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-amber-700">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Review</span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-brand-navy">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Total Coins Issued</span>
          </div>
          <div className="text-xl font-bold text-brand-navy mt-1">+{totalCoinsEmitted}</div>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
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
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by code, customer ID, name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:border-slate-800 w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="REWARDED">Rewarded</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Referral Code</th>
                <th className="px-5 py-3.5">Inviter (Referrer)</th>
                <th className="px-5 py-3.5">Invitee (New Customer)</th>
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
                    No referral attributions found matching criteria.
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
                      +{r.referrer_reward_coins || r.reward_coins} / +{r.referee_reward_coins || 100} Coins
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          STATUS_BADGES[r.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.rejection_reason && (
                        <div className="text-[10px] text-red-500 mt-0.5 truncate max-w-[120px]" title={r.rejection_reason}>
                          {r.rejection_reason}
                        </div>
                      )}
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
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] transition-colors cursor-pointer"
                            >
                              Qualify
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Enter rejection reason (optional):");
                                handleUpdateStatus(r.id, "REJECTED", reason || undefined);
                              }}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium text-[11px] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === "QUALIFIED" && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(r.id, "REWARDED")}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors cursor-pointer"
                            >
                              Reward Now
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt("Enter rejection reason (optional):");
                                handleUpdateStatus(r.id, "REJECTED", reason || undefined);
                              }}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium text-[11px] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {r.status === "REJECTED" && (
                          <button
                            onClick={() => handleUpdateStatus(r.id, "QUALIFIED")}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer"
                          >
                            Re-qualify
                          </button>
                        )}
                        {r.status === "REWARDED" && (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 justify-end">
                            <Check className="w-3.5 h-3.5" />
                            Completed
                          </span>
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
