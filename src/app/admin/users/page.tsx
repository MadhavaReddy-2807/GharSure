"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Eye,
  ShieldAlert,
  Loader2,
  RefreshCw,
  X,
  Save,
  Coins,
  ClipboardList,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

interface Customer {
  id: string;
  customer_id: string;
  phone_e164: string;
  full_name: string | null;
  display_name: string | null;
  city: string | null;
  onboarding_completed: boolean;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  reward_coins: number;
  created_at: string;
  surveys_count: number;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  // e.g. +91 98765 43210 -> +91 98*** **210
  return phone.slice(0, 5) + "•••••" + phone.slice(-3);
}

export default function AdminUsersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [onboardingFilter, setOnboardingFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Customer Detail Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailNotes, setDetailNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  // Audited Coin Adjustment State
  const [adjustAmount, setAdjustAmount] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjustingCoins, setIsAdjustingCoins] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // Confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    type: "SUSPEND" | "REACTIVATE";
    customer: Customer;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (onboardingFilter !== "ALL") params.set("onboarding", onboardingFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load customers");
      }

      setCustomers(data.customers);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to fetch user directory");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter, onboardingFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setIsLoadingDetail(true);
    setActionSuccessMessage("");
    setAdjustError("");
    setAdjustReason("");
    try {
      const res = await fetch(`/api/admin/users/${id}/details`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCustomerDetail(data);
        setDetailNotes(data.customer?.support_notes || "");
      } else {
        // Fallback to basic
        const basicRes = await fetch(`/api/admin/users/${id}`);
        const basicData = await basicRes.json();
        if (basicRes.ok && basicData.success) {
          setCustomerDetail({ customer: basicData.customer, ledger: [], surveys: [], submissions: [], vouchers: [], orders: [] });
          setDetailNotes(basicData.customer?.support_notes || "");
        }
      }
    } catch {
      // Handled
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !adjustAmount || !adjustReason.trim()) {
      setAdjustError("Please specify an adjustment amount and reason.");
      return;
    }

    setIsAdjustingCoins(true);
    setAdjustError("");
    try {
      const res = await fetch(`/api/admin/users/${selectedCustomerId}/adjust-coins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(adjustAmount),
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to adjust coins");
      }

      setActionSuccessMessage(data.message || "Balance adjusted successfully");
      setAdjustReason("");
      handleOpenDetail(selectedCustomerId);
      fetchCustomers();
    } catch (err: any) {
      setAdjustError(err.message);
    } finally {
      setIsAdjustingCoins(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomerId) return;
    setIsSavingNotes(true);
    setActionSuccessMessage("");
    try {
      const res = await fetch(`/api/admin/users/${selectedCustomerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportNotes: detailNotes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMessage("Support notes saved successfully");
        fetchCustomers();
      }
    } catch {
      // Handled
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleExecuteStatusChange = async () => {
    if (!confirmAction) return;
    setIsProcessingAction(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: confirmAction.customer.id,
          action: confirmAction.type,
          reason: `Admin requested ${confirmAction.type.toLowerCase()}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmAction(null);
        if (selectedCustomerId === confirmAction.customer.id) {
          handleOpenDetail(confirmAction.customer.id);
        }
        fetchCustomers();
      } else {
        alert(data.error || "Action failed");
      }
    } catch {
      alert("Network error executing action");
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleExportCsv = () => {
    window.open("/api/admin/users/export", "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real registered customer records, household parameters, and reward account balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Permitted CSV</span>
          </button>
          <button
            onClick={() => fetchCustomers()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ID (GH000001), phone, or name..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 text-xs text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          {["ALL", "ACTIVE", "SUSPENDED"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <div className="flex items-center gap-1 text-xs text-slate-500 mr-1">
            <span>Onboarding:</span>
          </div>
          {[
            { label: "All", val: "ALL" },
            { label: "Done", val: "COMPLETED" },
            { label: "Pending", val: "PENDING" },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => {
                setOnboardingFilter(item.val);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                onboardingFilter === item.val
                  ? "bg-brand-orange text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Customer ID</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Phone (Masked)</th>
                <th className="px-5 py-3.5">City</th>
                <th className="px-5 py-3.5">Onboarding</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Coins</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading real customer records...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customers found matching filter criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">
                      {c.customer_id}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {c.full_name || <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {maskPhone(c.phone_e164)}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {c.city || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {c.onboarding_completed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          Done
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          c.status === "ACTIVE"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {c.reward_coins || 0}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(c.id)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        {c.status === "ACTIVE" ? (
                          <button
                            onClick={() => setConfirmAction({ type: "SUSPEND", customer: c })}
                            className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 font-medium text-[11px] transition-colors"
                            title="Suspend account"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setConfirmAction({ type: "REACTIVATE", customer: c })}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-[11px] transition-colors"
                            title="Reactivate account"
                          >
                            Reactivate
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

        {/* Pagination footer */}
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {customers.length} of {total} customer records
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium text-slate-700"
            >
              Previous
            </button>
            <span className="px-2 font-mono font-medium">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Drawer Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center font-mono font-bold text-xs border border-orange-100">
                  GH
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">
                    {customerDetail?.customer_id || "Customer Details"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    UUID: {selectedCustomerId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {isLoadingDetail ? (
                <div className="py-20 text-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading customer history...
                </div>
              ) : customerDetail ? (
                <>
                  {actionSuccessMessage && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{actionSuccessMessage}</span>
                    </div>
                  )}

                  {/* Identity & Contact Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Account Identity</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          (customerDetail.customer?.onboarding_status === "SUSPENDED" || customerDetail.customer?.status === "SUSPENDED" || customerDetail.status === "SUSPENDED")
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {(customerDetail.customer?.onboarding_status === "SUSPENDED" || customerDetail.status === "SUSPENDED") ? "SUSPENDED" : "ACTIVE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Full Name</span>
                        <span className="font-medium text-slate-800">{customerDetail.customer?.full_name || customerDetail.full_name || "Unspecified"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Verified Phone</span>
                        <span className="font-mono text-slate-800">{customerDetail.customer?.phone_e164 || customerDetail.phone_e164}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Customer ID</span>
                        <span className="font-mono text-slate-800">{customerDetail.customer?.customer_id || customerDetail.customer_id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Registration Date</span>
                        <span className="text-slate-800">
                          {new Date(customerDetail.customer?.created_at || customerDetail.created_at || Date.now()).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Coin Balance & Audited Adjustment */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-800">Reward Coin Balance</span>
                      </div>
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {(customerDetail.customer?.reward_coins ?? customerDetail.reward_coins ?? 0).toLocaleString()} Coins
                      </span>
                    </div>

                    {/* Audited Adjustment Form */}
                    <form onSubmit={handleAdjustCoins} className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">Audited Coin Adjustment</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(parseInt(e.target.value, 10) || 0)}
                          placeholder="+/- Coins"
                          className="w-24 h-7 px-2 rounded border border-slate-200 text-xs font-mono"
                        />
                        <input
                          type="text"
                          required
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="Audited reason (e.g. Goodwill credit, survey re-adjustment)..."
                          className="flex-1 h-7 px-2 rounded border border-slate-200 text-xs"
                        />
                        <button
                          type="submit"
                          disabled={isAdjustingCoins || !adjustReason.trim()}
                          className="px-2.5 py-1 bg-brand-purple hover:bg-purple-700 disabled:opacity-50 text-white text-[11px] font-semibold rounded cursor-pointer"
                        >
                          {isAdjustingCoins ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply"}
                        </button>
                      </div>
                      {adjustError && <p className="text-[11px] text-rose-600">{adjustError}</p>}
                    </form>

                    {/* Transaction Ledger */}
                    {(customerDetail.ledger?.length > 0 || customerDetail.transactions?.length > 0) ? (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Recent Transactions</span>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {(customerDetail.ledger || customerDetail.transactions || []).map((tx: any) => (
                            <div key={tx.id} className="p-2 rounded bg-slate-50 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-medium text-slate-800 text-[11px]">{tx.description}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {new Date(tx.created_at).toLocaleDateString()} • {tx.type}
                                </p>
                              </div>
                              <span
                                className={`font-mono font-bold text-xs ${
                                  tx.amount > 0 ? "text-emerald-600" : "text-red-600"
                                }`}
                              >
                                {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No coin transactions recorded yet.</p>
                    )}
                  </div>

                  {/* Document Submissions */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Uploaded File Submissions</span>
                    {customerDetail.submissions?.length > 0 ? (
                      <div className="space-y-1.5">
                        {customerDetail.submissions.map((sub: any) => (
                          <div key={sub.id} className="p-2 rounded bg-slate-50 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-medium text-slate-800 text-[11px]">{sub.activity_title || sub.file_name}</p>
                              <p className="text-[10px] text-slate-400">{new Date(sub.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                              {sub.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No documents submitted yet.</p>
                    )}
                  </div>

                  {/* Vouchers & Orders */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <span className="text-xs font-bold text-slate-800 block">Vouchers ({customerDetail.vouchers?.length || 0})</span>
                      {customerDetail.vouchers?.length > 0 ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {customerDetail.vouchers.map((v: any) => (
                            <div key={v.id} className="p-1.5 rounded bg-slate-50 text-[11px] flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-800">{v.voucher_code}</span>
                              <span className="text-[10px] text-slate-500">{v.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">None unlocked</p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                      <span className="text-xs font-bold text-slate-800 block">Orders ({customerDetail.orders?.length || 0})</span>
                      {customerDetail.orders?.length > 0 ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {customerDetail.orders.map((o: any) => (
                            <div key={o.id} className="p-1.5 rounded bg-slate-50 text-[11px] flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-800">{o.order_number}</span>
                              <span className="text-[10px] text-emerald-700 font-bold">{o.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No orders yet</p>
                      )}
                    </div>
                  </div>

                  {/* Survey History */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-brand-orange" />
                      <span className="text-xs font-bold text-slate-800">Survey Participation History</span>
                    </div>

                    {customerDetail.surveys?.length > 0 ? (
                      <div className="space-y-1.5">
                        {customerDetail.surveys.map((sr: any) => (
                          <div
                            key={sr.id}
                            className="p-2 rounded border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-medium text-slate-800 text-[11px]">{sr.survey_title || "Survey"}</p>
                              <p className="text-[10px] text-slate-400">
                                Completed on {new Date(sr.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {sr.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No survey responses submitted yet.</p>
                    )}
                  </div>

                  {/* Support Notes */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Internal Support Notes</span>
                    <p className="text-[11px] text-slate-400">
                      Restricted to authorized administrators. Not visible to the customer.
                    </p>
                    <textarea
                      value={detailNotes}
                      onChange={(e) => setDetailNotes(e.target.value)}
                      rows={3}
                      placeholder="Add verified customer notes, escalations, or special instructions..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                    />
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-3 py-1.5 bg-brand-purple hover:bg-brand-purple/90 text-white font-medium text-xs rounded-lg inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isSavingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      <span>Save Notes</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close Drawer
              </button>
              {customerDetail && (
                <div>
                  {customerDetail.status === "ACTIVE" ? (
                    <button
                      onClick={() => setConfirmAction({ type: "SUSPEND", customer: customerDetail })}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-medium text-white transition-colors"
                    >
                      Suspend Customer
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAction({ type: "REACTIVATE", customer: customerDetail })}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-medium text-white transition-colors"
                    >
                      Reactivate Account
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Confirm {confirmAction.type === "SUSPEND" ? "Suspension" : "Reactivation"}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to {confirmAction.type.toLowerCase()}{" "}
              <strong className="text-slate-900">{confirmAction.customer.customer_id}</strong> (
              {confirmAction.customer.phone_e164})? This action is audited and affects platform access immediately.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isProcessingAction}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteStatusChange}
                disabled={isProcessingAction}
                className={`px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors flex items-center gap-1.5 ${
                  confirmAction.type === "SUSPEND"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isProcessingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm {confirmAction.type}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
