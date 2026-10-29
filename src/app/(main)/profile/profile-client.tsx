"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Lock,
  Mail,
  Home,
  Bell,
  Shield,
  LogOut,
  Trash2,
  Coins,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileClientViewProps {
  fullName: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  pincode?: string;
  coins: number;
  customerId: string;
  surveysCompleted: number;
  referralsRewarded: number;
}

export function ProfileClientView({
  fullName: initialFullName,
  phone,
  email: initialEmail = "",
  address: initialAddress = "",
  city: initialCity,
  pincode: initialPincode = "",
  coins,
  customerId,
  surveysCompleted,
  referralsRewarded,
}: ProfileClientViewProps) {
  const router = useRouter();

  // State
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [pincode, setPincode] = useState(initialPincode);

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(initialFullName);
  const [editEmail, setEditEmail] = useState(initialEmail);
  const [editAddress, setEditAddress] = useState(initialAddress);
  const [editCity, setEditCity] = useState(initialCity);
  const [editPincode, setEditPincode] = useState(initialPincode);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Preference Toggles
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [telemetryConsent, setTelemetryConsent] = useState(true);

  // Sign out / Delete Modals
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle Edit Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (!editName.trim() || editName.trim().length < 2) {
      setEditError("Full name must be at least 2 characters.");
      return;
    }

    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      setEditError("Please enter a valid email address.");
      return;
    }

    if (editPincode && !/^[0-9]{6}$/.test(editPincode.trim())) {
      setEditError("Pincode must be a 6-digit number.");
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
          email: editEmail.trim(),
          address: editAddress.trim(),
          city: editCity.trim(),
          pincode: editPincode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setEditError(data.error || "Failed to update profile.");
        setIsSaving(false);
        return;
      }

      setFullName(data.profile.fullName);
      setEmail(data.profile.email || "");
      setAddress(data.profile.address || "");
      setCity(data.profile.city || "Not set");
      setPincode(data.profile.pincode || "");

      setIsEditing(false);
      setSaveSuccess("Profile and doorstep address updated successfully.");
      setTimeout(() => setSaveSuccess(null), 3500);
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
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-16 select-none">
      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Account & Profile
            </h1>
            <p className="text-xs text-slate-400 font-mono">Member ID: {customerId}</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditName(fullName);
            setEditEmail(email);
            setEditAddress(address);
            setEditCity(city);
            setEditPincode(pincode);
            setEditError(null);
            setIsEditing(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Edit Details</span>
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. PERSONAL INFORMATION LIST (Clean list layout with subtle separators) */}
      <section aria-labelledby="personal-details-heading" className="space-y-3">
        <h2 id="personal-details-heading" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Personal Information
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
          <div className="p-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Full Name</span>
            <span className="font-semibold text-slate-900">{fullName}</span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Verified Mobile</span>
            <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
              <span>{phone}</span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-sans flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>Locked</span>
              </span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Email Address</span>
            <span className="font-medium text-slate-900">{email || "Not provided"}</span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">City Node</span>
            <span className="font-medium text-slate-900">{city}</span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Reward Coins</span>
            <Link
              href="/rewards"
              className="font-bold font-mono text-amber-700 hover:underline flex items-center gap-1"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>{coins.toLocaleString()} Coins</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </Link>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Research Surveys Completed</span>
            <span className="font-semibold text-slate-900">{surveysCompleted}</span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Verified Neighbor Referrals</span>
            <span className="font-semibold text-slate-900">{referralsRewarded}</span>
          </div>
        </div>
      </section>

      {/* 3. DOORSTEP DELIVERY ADDRESS */}
      <section aria-labelledby="shipping-address-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="shipping-address-heading" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Doorstep Delivery Address
          </h2>
          <button
            onClick={() => {
              setEditName(fullName);
              setEditEmail(email);
              setEditAddress(address);
              setEditCity(city);
              setEditPincode(pincode);
              setIsEditing(true);
            }}
            className="text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
          >
            Update Address
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs space-y-1.5">
          <div className="font-semibold text-slate-900">Primary Delivery Location</div>
          <p className="text-slate-600 leading-relaxed">
            {address ? (
              address
            ) : (
              <span className="text-slate-400 italic">
                No street address provided yet. Add your flat, building, and locality for trial kit deliveries.
              </span>
            )}
          </p>
          <div className="text-slate-500 pt-1 flex items-center gap-3">
            <span>City: {city}</span>
            {pincode && <span>Pincode: {pincode}</span>}
          </div>
        </div>
      </section>

      {/* 4. PREFERENCES & SECURITY */}
      <section aria-labelledby="preferences-heading" className="space-y-3">
        <h2 id="preferences-heading" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Preferences & Notifications
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 block">WhatsApp Dispatch Updates</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Delivery tracking and survey invitations sent to {phone}.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={whatsappAlerts}
                onChange={(e) => setWhatsappAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-slate-900" />
            </label>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-900 block">Community Telemetry Sharing</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Contribute anonymized water readings to apartment benchmarks.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telemetryConsent}
                onChange={(e) => setTelemetryConsent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-slate-900" />
            </label>
          </div>
        </div>
      </section>

      {/* 5. ACCOUNT ACTIONS */}
      <section className="pt-2 flex items-center gap-3">
        <button
          onClick={() => setIsSignOutModalOpen(true)}
          className="px-4 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500" />
          <span>Sign Out</span>
        </button>

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-4 py-2 rounded-md text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account</span>
        </button>
      </section>

      {/* ========================================================================= */}
      {/* EDIT PROFILE MODAL                                                        */}
      {/* ========================================================================= */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-5 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Edit Profile & Address</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-3 p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                  <span>Mobile Phone</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Permanent</span>
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={phone}
                  className="w-full h-8 px-3 rounded border border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-8 px-3 rounded border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-8 px-3 rounded border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Complete Address
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Flat, street, locality"
                  className="w-full p-2.5 rounded border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full h-8 px-3 rounded border border-slate-200 text-xs focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value)}
                    placeholder="6 digits"
                    className="w-full h-8 px-3 rounded border border-slate-200 text-xs font-mono focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-5 border border-slate-200 animate-fade-in text-center">
            <h3 className="text-sm font-bold text-slate-900">Sign Out of GharSure?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              You can log back in at any time with your phone number.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsSignOutModalOpen(false)}
                className="px-3.5 py-1.5 rounded border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-5 border border-slate-200 animate-fade-in text-center">
            <h3 className="text-sm font-bold text-rose-600">Delete Account?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              This action is irreversible. All unredeemed coins and records will be deleted.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3.5 py-1.5 rounded border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
