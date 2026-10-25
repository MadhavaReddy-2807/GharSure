"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User,
  RefreshCw,
  X,
} from "lucide-react";
import { AdminRole } from "@/lib/admin-auth";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  created_at: string;
  last_login_at: string | null;
}

const ROLES: { role: AdminRole; title: string; desc: string }[] = [
  { role: "SUPER_ADMIN", title: "Super Admin", desc: "Full administrative access, settings, and team management." },
  { role: "OPERATIONS_ADMIN", title: "Operations Admin", desc: "User management, surveys, rewards, store, and operations." },
  { role: "CONTENT_MANAGER", title: "Content Manager", desc: "Products, scorecards, surveys, and published content." },
  { role: "SUPPORT_ADMIN", title: "Support Admin", desc: "Customer lookup, tickets, and assistance." },
  { role: "ANALYST", title: "Analyst", desc: "Read-only access to platform metrics, reports, and audit logs." },
];

export default function AdminAccessPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("OPERATIONS_ADMIN");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Edit role modal state
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>("OPERATIONS_ADMIN");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/access");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load team list");
      }
      setAdmins(data.admins);
    } catch (err: any) {
      setError(err.message || "Failed to load admin directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setIsSubmittingInvite(true);

    try {
      const res = await fetch("/api/admin/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName,
          password: invitePassword,
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create administrator");
      }

      setSuccess(`Admin ${inviteEmail} invited with ${inviteRole} role.`);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      fetchAdmins();
    } catch (err: any) {
      setInviteError(err.message || "Invitation failed");
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRoleUpdate = async () => {
    if (!editingAdmin) return;
    setIsUpdatingRole(true);
    setError("");
    try {
      const res = await fetch("/api/admin/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAdminId: editingAdmin.id,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update role");
      }

      setSuccess(`Role updated to ${selectedRole} for ${editingAdmin.email}`);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    const nextStatus = admin.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmed = window.confirm(
      `Are you sure you want to set status to ${nextStatus} for ${admin.email}?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAdminId: admin.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Status update failed");
      }
      fetchAdmins();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Admin Access & Role-Based Permissions (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Server-controlled identity and permission assignments. Only Super Admins can manage team privileges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Administrator</span>
          </button>
          <button
            onClick={() => fetchAdmins()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success & Error alerts */}
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

      {/* Role Definitions Guide Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Configured Role Permissions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ROLES.map((r) => (
            <div key={r.role} className="p-3 rounded-lg bg-white border border-slate-200/80">
              <span className="text-xs font-bold text-slate-900 block">{r.title}</span>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Administrators Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Administrator</th>
                <th className="px-5 py-3.5">Assigned Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Login</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading authorized team members...</span>
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No administrators found.
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{a.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{a.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        <ShieldCheck className="w-3 h-3 text-brand-orange" />
                        {a.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          a.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {a.last_login_at ? (
                        new Date(a.last_login_at).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      ) : (
                        <span className="text-slate-400 italic">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-400 font-sans">
                      {new Date(a.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingAdmin(a);
                            setSelectedRole(a.role);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => handleToggleStatus(a)}
                          className={`px-2 py-1 rounded font-medium text-[11px] transition-colors ${
                            a.status === "ACTIVE"
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {a.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold text-slate-900">
                  Invite New Administrator
                </h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mb-4">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    required
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="priya@gharsure.com"
                    required
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Temporary Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                >
                  {ROLES.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmittingInvite && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Change Role for {editingAdmin.full_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{editingAdmin.email}</p>

            <div className="space-y-2 mb-6">
              {ROLES.map((r) => (
                <label
                  key={r.role}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                    selectedRole === r.role
                      ? "border-brand-orange bg-orange-50/40"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="admin_role_select"
                    checked={selectedRole === r.role}
                    onChange={() => setSelectedRole(r.role)}
                    className="mt-0.5 text-brand-orange focus:ring-brand-orange"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{r.title}</span>
                    <span className="text-[11px] text-slate-500 block">{r.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingAdmin(null)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                disabled={isUpdatingRole}
                className="px-4 py-2 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isUpdatingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Role</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
