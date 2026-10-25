"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  PlusCircle,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
  X,
  Send,
  History,
} from "lucide-react";

interface Transaction {
  id: string;
  customer_id: string;
  readable_customer_id: string;
  customer_name: string | null;
  phone_e164: string;
  amount: number;
  type: string;
  description: string;
  idempotency_key: string;
  admin_email?: string | null;
  created_at: string;
}

export default function AdminRewardsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Adjustment Modal State
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [targetCustomerId, setTargetCustomerId] = useState("");
  const [amount, setAmount] = useState<number>(50);
  const [reasonCode, setReasonCode] = useState("SUPPORT_GOODWILL");
  const [description, setDescription] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer search helper in modal
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const fetchLedger = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rewards?limit=50");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load ledger");
      setTransactions(data.transactions);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleOpenAdjustment = () => {
    setIsAdjustmentOpen(true);
    setSelectedUser(null);
    setTargetCustomerId("");
    setUserQuery("");
    setSearchResults([]);
    setAmount(50);
    setReasonCode("SUPPORT_GOODWILL");
    setDescription("");
    // Generate UUID v4 for idempotency
    setIdempotencyKey(`adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  };

  const handleSearchCustomer = async () => {
    if (!userQuery.trim()) return;
    setIsSearchingUser(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userQuery.trim())}&limit=5`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSearchResults(data.customers || []);
      }
    } catch {
      // Handled
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setTargetCustomerId(user.id);
    setSearchResults([]);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomerId) {
      alert("Please select a customer first.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: targetCustomerId,
          amount: Number(amount),
          reasonCode,
          description,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Adjustment failed");

      setSuccess(`Adjusted ${amount > 0 ? `+${amount}` : amount} coins for ${selectedUser?.customer_id || "customer"}.`);
      setIsAdjustmentOpen(false);
      fetchLedger();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Rewards & Coin Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable transaction ledger, duplicate-safe adjustments, and coin emission rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdjustment}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Manual Coin Adjustment</span>
          </button>
          <button
            onClick={() => fetchLedger()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
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

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ledger Entries ({total})
          </span>
          <span className="text-[11px] text-slate-400">
            Strictly immutable records with server-enforced idempotency
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Idempotency Key</th>
                <th className="px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading authoritative ledger...</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-slate-400 font-sans">
                      {new Date(t.created_at).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900">{t.readable_customer_id}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{t.customer_name || t.phone_e164}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-sans text-slate-700 max-w-xs truncate">
                      {t.description}
                      {t.admin_email && (
                        <span className="block text-[10px] text-slate-400">By {t.admin_email}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-400 truncate max-w-[140px]" title={t.idempotency_key}>
                      {t.idempotency_key}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`font-bold text-xs ${
                          t.amount > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {t.amount > 0 ? `+${t.amount}` : t.amount} Coins
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Coin Adjustment Modal */}
      {isAdjustmentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">
                  Manual Coin Ledger Adjustment
                </h3>
              </div>
              <button onClick={() => setIsAdjustmentOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-3.5">
              {/* Customer Lookup */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Customer
                </label>
                {selectedUser ? (
                  <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{selectedUser.customer_id}</span>
                      <span className="text-slate-500 ml-2">({selectedUser.full_name || selectedUser.phone_e164})</span>
                      <span className="block text-[11px] text-slate-400 font-mono">Current Balance: {selectedUser.reward_coins || 0} coins</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Search ID, phone, or name..."
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                      />
                      <button
                        type="button"
                        onClick={handleSearchCustomer}
                        disabled={isSearchingUser}
                        className="px-3 h-9 bg-slate-900 text-white rounded-lg text-xs font-medium"
                      >
                        {isSearchingUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lookup"}
                      </button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="border border-slate-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                        {searchResults.map((usr) => (
                          <button
                            key={usr.id}
                            type="button"
                            onClick={() => handleSelectUser(usr)}
                            className="w-full text-left p-2 hover:bg-white text-xs flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-slate-900 font-mono">{usr.customer_id}</span>
                              <span className="text-slate-500 ml-1.5">{usr.full_name || usr.phone_e164}</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">{usr.reward_coins || 0} coins</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Adjustment Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Coin Amount (+ to Credit, - to Debit)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              {/* Reason Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Reason Code
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                >
                  <option value="SUPPORT_GOODWILL">SUPPORT_GOODWILL - Customer Support Discretion</option>
                  <option value="SURVEY_RECONCILIATION">SURVEY_RECONCILIATION - Missed Survey Payout</option>
                  <option value="REFERRAL_CORRECTION">REFERRAL_CORRECTION - Manual Referral Credit</option>
                  <option value="PROMOTIONAL_BONUS">PROMOTIONAL_BONUS - Campaign Bonus</option>
                  <option value="FRAUD_PENALTY_REVERSAL">FRAUD_PENALTY_REVERSAL - Penalty Deduction</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Audit Justification
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="State the verifiable reason for adjusting this user's balance..."
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              {/* Idempotency Key */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Idempotency Key (Prevents Duplicate Credits)
                </label>
                <input
                  type="text"
                  value={idempotencyKey}
                  readOnly
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-mono bg-slate-50 text-slate-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !targetCustomerId}
                  className="px-4 py-2 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Ledger Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
