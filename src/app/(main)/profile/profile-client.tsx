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
  FileText,
  Trash2,
  Lock,
  Mail,
  Plus,
  MessageSquare,
  Sparkles,
  Coins,
} from "lucide-react";

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
  initialUserPosts?: any[];
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
  initialUserPosts = [],
}: ProfileClientViewProps) {
  const router = useRouter();

  // State
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [pincode, setPincode] = useState(initialPincode);
  const [userPosts, setUserPosts] = useState<any[]>(initialUserPosts);

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

  // New Post Modal State
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("Water Quality");
  const [postType, setPostType] = useState<"QUESTION" | "OBSERVATION">("QUESTION");
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Preference Toggles
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [telemetryConsent, setTelemetryConsent] = useState(true);

  // Modals
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      setSaveSuccess("Profile and doorstep address saved successfully.");
      setTimeout(() => setSaveSuccess(null), 4000);
      router.refresh();
    } catch {
      setEditError("Connection error. Could not update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Creating a New Community Post / Question
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPost) return;

    if (!postTitle.trim() || postTitle.trim().length < 3) {
      alert("Title must be at least 3 characters.");
      return;
    }

    setIsSubmittingPost(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle.trim(),
          content: postContent.trim() || postTitle.trim(),
          category: postCategory,
          postType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish post.");
      }

      setUserPosts((prev) => [data.post, ...prev]);
      setIsPostModalOpen(false);
      setPostTitle("");
      setPostContent("");
      setSaveSuccess("Your question has been published to the community!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Could not publish post.");
    } finally {
      setIsSubmittingPost(false);
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
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-20 select-none">
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
            setEditEmail(email);
            setEditAddress(address);
            setEditCity(city);
            setEditPincode(pincode);
            setEditError(null);
            setIsEditing(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs"
        >
          <Edit2 className="w-3.5 h-3.5 text-brand-purple" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Success Alert */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div className="w-13 h-13 rounded-2xl bg-brand-purple text-white flex items-center justify-center font-bold text-base tracking-tight shrink-0 shadow-xs">
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

            {/* Read-only Locked Phone */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono mt-0.5">
              <span>{phone}</span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                <Lock className="w-2.5 h-2.5" />
                <span>Cannot be changed</span>
              </span>
            </div>

            {/* Email and Location */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <div className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-brand-purple" />
                <span>{email || "No email added"}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-brand-purple" />
                <span>{city || "City not set"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
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
            <div className="text-[10px] font-semibold uppercase text-slate-400">Posts</div>
            <div className="text-sm font-bold font-mono text-brand-purple mt-0.5">
              {userPosts.length}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Complete Address & Contact Details */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Doorstep Delivery Address
          </h3>
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

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-slate-900">
                Primary Shipping Address
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {address ? (
                  <span>{address}</span>
                ) : (
                  <span className="text-slate-400 italic">
                    No street address provided yet. Add your flat/house and locality for trial kit deliveries.
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  City: {city}
                </span>
                {pincode && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                    PIN: {pincode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: My Questions & Community Posts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>My Questions & Posts</span>
            <span className="text-[10px] font-bold text-brand-purple bg-purple-50 px-2 py-0.2 rounded border border-purple-200">
              {userPosts.length}
            </span>
          </h3>

          <button
            onClick={() => setIsPostModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ask Question</span>
          </button>
        </div>

        {userPosts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Community Questions Yet</h4>
            <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
              Ask about water hardness, descaling tips, or purifier issues. Use the (+) button to post!
            </p>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ask a Question</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-brand-purple bg-purple-50 px-2 py-0.5 rounded border border-purple-200 uppercase tracking-wider">
                    {post.category || "Water Quality"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(post.created_at).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {post.title}
                </h4>
                {post.content && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                )}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <span>{post.replies_count ?? 0} community responses</span>
                  </span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                    Published
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: Account Preferences */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Preferences & Security
        </h3>

        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {/* WhatsApp Notifications Toggle */}
          <div className="p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block">WhatsApp Notifications</span>
                <p className="text-[11px] text-slate-500">
                  Doorstep dispatch updates and survey invitations to {phone}.
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
        </div>
      </div>

      {/* Account Actions (Sign Out & Delete) */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
        <button
          onClick={() => setIsSignOutModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500" />
          <span>Sign Out</span>
        </button>

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* EDIT PROFILE MODAL (NAME, EMAIL, ADDRESS, CITY, PINCODE; PHONE LOCKED)   */}
      {/* ========================================================================= */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-slate-200 animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 text-brand-purple flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Profile & Address</h3>
                  <span className="text-[10px] text-slate-400">Doorstep delivery information</span>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              {/* Phone Number (Read-Only Locked) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
                  <span>Mobile Phone Number</span>
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={phone}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs cursor-not-allowed select-none"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Primary mobile number is verified with WhatsApp OTP and cannot be changed.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Used for order receipts and lab test scorecards.
                </p>
              </div>

              {/* Complete Address */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Complete Address (Flat, Street, Locality)
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Tower B, Palm Meadows, Whitefield"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              {/* City and Pincode */}
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
                    placeholder="Bangalore"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
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
                    placeholder="560066"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASK QUESTION / CREATE POST MODAL                                          */}
      {/* ========================================================================= */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 text-brand-purple flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ask a Question / Post</h3>
                  <p className="text-[10px] text-slate-400">Share with the GharSure homeowner community</p>
                </div>
              </div>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPostType("QUESTION")}
                  className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                    postType === "QUESTION"
                      ? "border-brand-purple bg-purple-50 text-brand-purple"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Ask a Question
                </button>
                <button
                  type="button"
                  onClick={() => setPostType("OBSERVATION")}
                  className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                    postType === "OBSERVATION"
                      ? "border-brand-purple bg-purple-50 text-brand-purple"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Water Observation
                </button>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Topic Category *
                </label>
                <select
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white"
                >
                  <option value="Water Quality">Water Quality & Hardness</option>
                  <option value="RO Purifiers">RO Purifiers & Filters</option>
                  <option value="Geysers & Descaling">Geysers & Scaling</option>
                  <option value="Store Trials">Store Trial Feedback</option>
                  <option value="General Home Care">General Home Care</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Question / Title *
                </label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. How to reduce TDS in high-rise borewell supply?"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Details / Context
                </label>
                <textarea
                  rows={3}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share details about your locality, water taste, or appliance behavior..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPost}
                  className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingPost ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <span>Publish to Community</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 border border-slate-200 animate-fade-in text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Sign Out of GharSure?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              You can sign back in anytime with your mobile number.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsSignOutModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1"
              >
                {isLoggingOut ? "Signing out..." : "Yes, Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 border border-slate-200 animate-fade-in text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Delete Account?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              This will permanently revoke your session, anonymize your data, and close access.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
