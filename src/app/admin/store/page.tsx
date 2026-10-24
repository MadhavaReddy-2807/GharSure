"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit2,
  X,
  Gift,
  Boxes,
} from "lucide-react";

interface TrialCampaign {
  id: string;
  title: string;
  description: string;
  coin_cost: number;
  inventory_stock: number;
  redeemed_count: number;
  status: "ACTIVE" | "PAUSED" | "EXHAUSTED" | "CLOSED";
  partner_name: string | null;
  product_title?: string | null;
  created_at: string;
}

export default function AdminStorePage() {
  const [trials, setTrials] = useState<TrialCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coinCost, setCoinCost] = useState<number>(0);
  const [inventoryStock, setInventoryStock] = useState<number>(100);
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED" | "EXHAUSTED" | "CLOSED">("ACTIVE");
  const [partnerName, setPartnerName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchTrials = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/store");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load campaigns");
      setTrials(data.trials);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrials();
  }, [fetchTrials]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCoinCost(0);
    setInventoryStock(0);
    setStatus("ACTIVE");
    setPartnerName("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: TrialCampaign) => {
    setEditingId(t.id);
    setTitle(t.title);
    setDescription(t.description || "");
    setCoinCost(t.coin_cost);
    setInventoryStock(t.inventory_stock);
    setStatus(t.status);
    setPartnerName(t.partner_name || "");
    setIsModalOpen(true);
  };

  const handleSaveTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          title,
          description,
          coinCost: Number(coinCost),
          inventoryStock: Number(inventoryStock),
          status,
          partnerName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save trial campaign");

      setSuccess(`Trial campaign "${title}" saved successfully.`);
      setIsModalOpen(false);
      fetchTrials();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Store, Trials & Voucher Campaigns
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consumer-facing ₹0 trial kits, sample distributions, and partner vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Trial Campaign</span>
          </button>
          <button
            onClick={() => fetchTrials()}
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

      {/* Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Campaign Title</th>
                <th className="px-5 py-3.5">Cost</th>
                <th className="px-5 py-3.5">Stock Remaining</th>
                <th className="px-5 py-3.5">Redeemed</th>
                <th className="px-5 py-3.5">Partner / Sponsor</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading trial campaigns...</span>
                  </td>
                </tr>
              ) : trials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No active campaigns.
                  </td>
                </tr>
              ) : (
                trials.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      <div className="text-[11px] text-slate-400 max-w-sm truncate">{t.description}</div>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold">
                      {t.coin_cost === 0 ? (
                        <span className="text-emerald-600">₹0 Trial</span>
                      ) : (
                        <span className="text-amber-600">{t.coin_cost} Coins</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono font-semibold text-slate-800">
                      {t.inventory_stock} units
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600">
                      {t.redeemed_count}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {t.partner_name || "GharSure"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingId ? "Edit Campaign" : "New Trial Campaign"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTrial} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Zero-Cost Water Hardness Test Strip Kit"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What the customer receives in this trial..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Coin Cost (0 for ₹0 Trial)
                  </label>
                  <input
                    type="number"
                    value={coinCost}
                    onChange={(e) => setCoinCost(Number(e.target.value))}
                    min={0}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Inventory Stock
                  </label>
                  <input
                    type="number"
                    value={inventoryStock}
                    onChange={(e) => setInventoryStock(Number(e.target.value))}
                    min={0}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Partner / Sponsor
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. EcoClean Labs"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="EXHAUSTED">EXHAUSTED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Campaign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
