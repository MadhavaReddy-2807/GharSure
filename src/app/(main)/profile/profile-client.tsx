"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Home,
  MapPin,
  Bell,
  HelpCircle,
  Shield,
  LogOut,
  ShieldCheck,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Wrench,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface ProfileClientViewProps {
  fullName: string;
  phone: string;
  city: string;
  coins: number;
  customerId: string;
  surveysCompleted: number;
  referralsRewarded: number;
}

export function ProfileClientView({
  fullName: initialFullName,
  phone,
  city: initialCity,
  coins,
  customerId,
  surveysCompleted,
  referralsRewarded,
}: ProfileClientViewProps) {
  const router = useRouter();

  // State
  const [fullName, setFullName] = useState(initialFullName);
  const [city, setCity] = useState(initialCity);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(initialFullName);
  const [editCity, setEditCity] = useState(initialCity);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Preference Toggles
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [telemetryConsent, setTelemetryConsent] = useState(true);

  // Modals
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Generate initials for avatar fallback
  const initials =
    fullName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GS";

  // Handle Edit Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!editName.trim() || editName.trim().length < 2) {
      setEditError("Name must be at least 2 characters.");
      return;
    }

    setIsSaving(true);
    setEditError(null);

    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editName.trim(),
          city: editCity.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEditError(data.error || "Failed to update profile.");
        setIsSaving(false);
        return;
      }

      setFullName(data.profile.fullName);
      setCity(data.profile.city || "Not set");
      setIsEditing(false);
      setSaveSuccess("Profile updated successfully.");
      setTimeout(() => setSaveSuccess(null), 3000);
      router.refresh();
    } catch {
      setEditError("Connection error. Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/auth");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/customer/profile", { method: "DELETE" });
      if (res.ok) {
        router.push("/auth");
        router.refresh();
      }
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-10 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              My Profile
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">Customer ID: {customerId}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditName(fullName);
            setEditCity(city);
            setIsEditing(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5 text-brand-purple" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-brand-purple text-white flex items-center justify-center font-bold text-base tracking-tight shrink-0">
            {initials}
          </div>

          {/* User Details */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {fullName}
              </h2>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">{phone}</p>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="w-3 h-3 text-brand-purple" />
              <span>{city}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div className="text-center px-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Coins</div>
            <div className="text-sm font-bold font-mono text-amber-700 mt-0.5">
              {coins.toLocaleString()}
            </div>
          </div>
          <div className="text-center px-2 border-x border-slate-200">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Surveys</div>
            <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
              {surveysCompleted}
            </div>
          </div>
          <div className="text-center px-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Referrals</div>
            <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
              {referralsRewarded}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Household & Appliances */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Household & Appliances
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          <div className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Home Residence</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Apartment residence · Primary water source: Municipal supply + RO Purifier
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  3 BHK
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  Water Hardness: 380 ppm
                </span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-900">Registered Appliances</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">3 Devices Active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div className="font-semibold text-slate-800">Kent Grand Plus RO</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Filter OK (~45 days)</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div className="font-semibold text-slate-800">IFB Front Load Washer</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Descaling Due</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div className="font-semibold text-slate-800">AO Smith 25L Geyser</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Anode Rod Verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Account Preferences */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Preferences
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {/* WhatsApp Notifications Toggle */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">WhatsApp Notifications</span>
                <p className="text-[11px] text-slate-500">
                  Dispatch updates and survey invitations.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappAlerts}
                onChange={(e) => setWhatsappAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-purple" />
            </label>
          </div>

          {/* Privacy & Telemetry Consent */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Community Telemetry Sharing</span>
                <p className="text-[11px] text-slate-500">
                  Contribute anonymized water readings to society benchmarks.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telemetryConsent}
                onChange={(e) => setTelemetryConsent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-purple" />
            </label>
          </div>

          {/* Help & Support Button */}
          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Help & Support Desk</span>
                <p className="text-[11px] text-slate-500">Contact resident support or read FAQs.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Terms & Privacy Notice */}
          <button
            type="button"
            onClick={() => setIsTermsModalOpen(true)}
            className="w-full p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">Terms of Service & Privacy</span>
                <p className="text-[11px] text-slate-500">Data protection and coin rules.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* SECTION 3: Account Actions */}
      <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setIsSignOutModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
          <span>Sign Out</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full sm:w-auto px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:underline flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-5 border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Edit Profile</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  City / Locality
                </label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIGN OUT CONFIRMATION MODAL */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-5 border border-slate-200 animate-fade-in text-center">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Sign out of GharSure?</h3>
            <p className="text-xs text-slate-500 mb-4">
              You can sign back in anytime with your WhatsApp verified number.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple/90 cursor-pointer"
              >
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-5 border border-slate-200 animate-fade-in text-center">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Account?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Your profile, coin wallet, and household records will be permanently removed.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPORT MODAL */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-5 border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Support Desk</h3>
              <button onClick={() => setIsSupportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              For assistance with water readings, survey rewards, or appliance trials, reach out to our team:
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 mb-4">
              <div className="font-semibold text-slate-900">Email: support@gharsure.com</div>
              <div className="text-slate-500">Response time: Within 24 hours</div>
            </div>
            <button
              onClick={() => setIsSupportModalOpen(false)}
              className="w-full py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TERMS MODAL */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 border border-slate-200 animate-fade-in max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase">Terms & Privacy</h3>
              <button onClick={() => setIsTermsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed mb-4">
              <p><strong>1. Privacy:</strong> Contact numbers and survey responses are never sold to external marketing agencies.</p>
              <p><strong>2. Telemetry:</strong> Water hardness readings are aggregated anonymously to compute society-level insights.</p>
              <p><strong>3. Coin Ledger:</strong> Reward coins possess no cash fiat value and are redeemable solely for platform trial kits.</p>
            </div>
            <button
              onClick={() => setIsTermsModalOpen(false)}
              className="w-full py-1.5 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
