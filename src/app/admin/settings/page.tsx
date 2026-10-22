"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  Sliders,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Form states
  const [rewardRules, setRewardRules] = useState({
    signup_bonus_coins: 100,
    referral_bonus_coins: 100,
    min_redemption_coins: 50,
  });

  const [surveyDefaults, setSurveyDefaults] = useState({
    default_reward_coins: 50,
    default_response_quota: 500,
    allow_anonymous: false,
  });

  const [featureFlags, setFeatureFlags] = useState({
    enable_referrals: true,
    enable_store_trials: true,
    enable_building_intel: true,
  });

  const [moderationPolicies, setModerationPolicies] = useState({
    require_review_for_observations: true,
  });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load settings");
      setSettings(data.settings);

      if (data.settings.reward_rules) setRewardRules(data.settings.reward_rules);
      if (data.settings.survey_defaults) setSurveyDefaults(data.settings.survey_defaults);
      if (data.settings.feature_flags) setFeatureFlags(data.settings.feature_flags);
      if (data.settings.content_moderation) setModerationPolicies(data.settings.content_moderation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSetting = async (key: string, value: any) => {
    setSavingKey(key);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save configuration");
      setSuccess(`Configuration "${key}" updated and audited successfully.`);
      fetchSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            System & Runtime Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Platform coin rules, survey quotas, feature toggles, and community moderation policies.
          </p>
        </div>

        <button
          onClick={() => fetchSettings()}
          className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto"
          title="Refresh settings"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reward Rules */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Platform Coin Emission Rules</h2>
              <p className="text-[11px] text-slate-500">Incentive amounts credited to verified households</p>
            </div>
            <button
              onClick={() => handleSaveSetting("reward_rules", rewardRules)}
              disabled={savingKey === "reward_rules"}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {savingKey === "reward_rules" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Save Rules</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                New User Onboarding Bonus (Coins)
              </label>
              <input
                type="number"
                value={rewardRules.signup_bonus_coins}
                onChange={(e) => setRewardRules({ ...rewardRules, signup_bonus_coins: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Referral Attribution Bonus (Coins)
              </label>
              <input
                type="number"
                value={rewardRules.referral_bonus_coins}
                onChange={(e) => setRewardRules({ ...rewardRules, referral_bonus_coins: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Minimum Redemption Threshold (Coins)
              </label>
              <input
                type="number"
                value={rewardRules.min_redemption_coins}
                onChange={(e) => setRewardRules({ ...rewardRules, min_redemption_coins: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-slate-200 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Survey Defaults */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Survey Default Configuration</h2>
              <p className="text-[11px] text-slate-500">Preset values applied to new survey research drafts</p>
            </div>
            <button
              onClick={() => handleSaveSetting("survey_defaults", surveyDefaults)}
              disabled={savingKey === "survey_defaults"}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {savingKey === "survey_defaults" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Save Defaults</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Default Reward per Completion (Coins)
              </label>
              <input
                type="number"
                value={surveyDefaults.default_reward_coins}
                onChange={(e) => setSurveyDefaults({ ...surveyDefaults, default_reward_coins: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Default Response Quota Cap
              </label>
              <input
                type="number"
                value={surveyDefaults.default_response_quota}
                onChange={(e) => setSurveyDefaults({ ...surveyDefaults, default_response_quota: Number(e.target.value) })}
                className="w-full h-8 px-2.5 rounded border border-slate-200 font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-700 font-semibold">Allow Anonymous Responses</span>
              <button
                type="button"
                onClick={() => setSurveyDefaults({ ...surveyDefaults, allow_anonymous: !surveyDefaults.allow_anonymous })}
                className="text-slate-400 hover:text-slate-600"
              >
                {surveyDefaults.allow_anonymous ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Runtime Feature Flags</h2>
              <p className="text-[11px] text-slate-500">Enable or disable consumer modules instantly</p>
            </div>
            <button
              onClick={() => handleSaveSetting("feature_flags", featureFlags)}
              disabled={savingKey === "feature_flags"}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {savingKey === "feature_flags" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Save Flags</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <div>
                <span className="font-semibold text-slate-800 block">Referral Program</span>
                <span className="text-[11px] text-slate-400">Allows users to share invite codes for coins</span>
              </div>
              <button
                type="button"
                onClick={() => setFeatureFlags({ ...featureFlags, enable_referrals: !featureFlags.enable_referrals })}
              >
                {featureFlags.enable_referrals ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <div>
                <span className="font-semibold text-slate-800 block">Store & Trial Kits Catalogue</span>
                <span className="text-[11px] text-slate-400">Allows users to claim ₹0 sample boxes</span>
              </div>
              <button
                type="button"
                onClick={() => setFeatureFlags({ ...featureFlags, enable_store_trials: !featureFlags.enable_store_trials })}
              >
                {featureFlags.enable_store_trials ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-300" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="font-semibold text-slate-800 block">Building & TDS Intelligence</span>
                <span className="text-[11px] text-slate-400">Society-level water quality comparisons</span>
              </div>
              <button
                type="button"
                onClick={() => setFeatureFlags({ ...featureFlags, enable_building_intel: !featureFlags.enable_building_intel })}
              >
                {featureFlags.enable_building_intel ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Moderation Policies */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Content Moderation Policies</h2>
              <p className="text-[11px] text-slate-500">Safeguards against unverified public claims</p>
            </div>
            <button
              onClick={() => handleSaveSetting("content_moderation", moderationPolicies)}
              disabled={savingKey === "content_moderation"}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {savingKey === "content_moderation" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Save Policies</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="font-semibold text-slate-800 block">Require Administrative Review for Observations</span>
                <span className="text-[11px] text-slate-400">Hold resident water/dampness reports in pending state until approved</span>
              </div>
              <button
                type="button"
                onClick={() => setModerationPolicies({ ...moderationPolicies, require_review_for_observations: !moderationPolicies.require_review_for_observations })}
              >
                {moderationPolicies.require_review_for_observations ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
