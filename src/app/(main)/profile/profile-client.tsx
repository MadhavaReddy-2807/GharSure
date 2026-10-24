"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  Home,
  MapPin,
  Bookmark,
  Bell,
  HelpCircle,
  Shield,
  Settings,
  LogOut,
  Coins,
  User,
  ShieldCheck,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Wrench,
  Droplets,
  Building2,
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
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-12 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              My Profile & Settings
            </h1>
            <p className="text-xs text-slate-500 font-mono">ID: {customerId}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditName(fullName);
            setEditCity(city);
            setIsEditing(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
        >
          <Edit2 className="w-3.5 h-3.5 text-brand-purple" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between animate-fade-in shadow-xs">
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
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl tracking-tight shadow-sm shrink-0">
            {initials}
          </div>

          {/* User Details */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                {fullName}
              </h2>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 font-mono mt-0.5">{phone}</p>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <MapPin className="w-3 h-3 text-brand-purple" />
              <span>{city}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="text-center px-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Coins</div>
            <div className="text-base font-bold font-mono text-brand-orange mt-0.5">
              {coins.toLocaleString()}
            </div>
          </div>
          <div className="text-center px-2 border-x border-slate-200">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Surveys</div>
            <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
              {surveysCompleted}
            </div>
          </div>
          <div className="text-center px-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Referrals</div>
            <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
              {referralsRewarded}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: My Household & Appliances */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          My Household & Telemetry
        </h3>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* Household Details */}
          <div className="p-4 sm:p-5 flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Home Profile</span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apartment residence · Primary water source: Municipal supply + RO Purifier
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    3 BHK
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    Water Hardness: 380 ppm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Registered Appliances */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-brand-orange" />
                <span className="text-xs font-bold text-slate-900">Registered Appliances & Maintenance</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">3 Devices Active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="font-bold text-slate-800">Kent Grand Plus RO</div>
                <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Filter OK (~45 days)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="font-bold text-slate-800">IFB Front Load Washer</div>
                <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Descaling Due</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="font-bold text-slate-800">AO Smith 25L Geyser</div>
                <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Anode Rod Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Account, Preferences & Privacy */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Account & Preferences
        </h3>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* WhatsApp Notifications Toggle */}
          <div className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">WhatsApp Notifications</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Receive verified trial kit dispatch updates and new survey alerts.
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
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-purple" />
            </label>
          </div>

          {/* Privacy & Telemetry Consent */}
          <div className="p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Community Telemetry Sharing</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Contribute anonymized water test readings to your society benchmark.
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
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-purple" />
            </label>
          </div>

          {/* Help & Support Button */}
          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Help & Support Desk</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Contact resident support or read FAQs.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Terms & Privacy Notice */}
          <button
            type="button"
            onClick={() => setIsTermsModalOpen(true)}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Terms of Service & Privacy Policy</span>
                <p className="text-[11px] text-slate-500 mt-0.5">Read data protection and coin redemption rules.</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* SECTION 3: Account Actions & Danger Zone */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsSignOutModalOpen(true)}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400" />
          <span>Sign Out</span>
        </button>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Request Account Deletion</span>
        </button>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-purple" />
                <h3 className="text-sm font-bold text-slate-900">Edit Resident Profile</h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Locality
                </label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SIGN OUT CONFIRMATION MODAL */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Sign out of GharSure?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              You will need to verify your WhatsApp number to sign back in.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Sign Out</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNT DELETION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Request Account Deletion</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This action will deactivate your profile, revoke active sessions, and schedule your data for permanent deletion in compliance with data privacy regulations. Unredeemed coin balances will be forfeited.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Keep Account
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELP & SUPPORT MODAL */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-fade-in text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand-purple" />
                <h3 className="font-bold text-sm text-slate-900">Resident Support & FAQ</h3>
              </div>
              <button onClick={() => setIsSupportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-slate-600 leading-relaxed">
              <p>
                <strong>How do reward coins work?</strong> You earn coins by completing localized surveys and diagnostics. Coins can be redeemed for ₹0 trial kits and appliance spares.
              </p>
              <p>
                <strong>Need WhatsApp Support?</strong> Our community engineering desk is available 9 AM - 6 PM IST on WhatsApp for water purifier testing and telemetry assistance.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSupportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TERMS & PRIVACY MODAL */}
      {isTermsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-fade-in text-xs space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">Terms & Privacy Principles</h3>
              </div>
              <button onClick={() => setIsTermsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-slate-600 leading-relaxed">
              <p>
                <strong>1. Data Confidentiality:</strong> GharSure operates strictly on a privacy-first model. Individual survey responses and contact numbers are never sold or shared with commercial marketing agencies.
              </p>
              <p>
                <strong>2. Community Telemetry:</strong> Water hardness (TDS) readings are aggregated at the building/pincode level to produce accurate community water reports.
              </p>
              <p>
                <strong>3. Coin Ledger:</strong> Reward coins possess no monetary fiat value and are redeemable solely within the GharSure platform for verified trial kits and products.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
