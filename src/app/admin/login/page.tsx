"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, AlertCircle, ArrowRight, Loader2, Lock, Mail } from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Authentication failed. Check credentials.");
        setIsLoading(false);
        return;
      }

      // Success -> navigate to target or /admin
      router.push(from);
      router.refresh();
    } catch {
      setErrorMessage("Network error. Could not connect to authentication service.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-50 text-brand-purple border border-purple-100 mb-3 shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Ghar<span className="text-brand-purple">Sure</span> Admin Portal
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Authorized personnel access only
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Admin Work Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@gharsure.com"
              required
              disabled={isLoading}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={isLoading}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 mt-2 bg-brand-purple hover:bg-brand-purple/90 active:bg-brand-purple-600 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign in to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Security note */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-[11px] text-slate-400">
          All administrative operations are monitored and recorded in audit logs.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-slate-400">Loading...</div>}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
