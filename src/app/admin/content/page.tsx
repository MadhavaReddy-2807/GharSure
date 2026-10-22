"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PackageOpen,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Edit2,
  X,
  ExternalLink,
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  category: string;
  brand: string;
  summary: string;
  specifications: Record<string, any>;
  price_inr: string | number;
  score: number | null;
  scorecard_details: Record<string, any>;
  evidence_sources: Array<{ source: string; type: string }>;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  created_at: string;
}

export default function AdminContentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Water Purifiers");
  const [brand, setBrand] = useState("");
  const [summary, setSummary] = useState("");
  const [priceInr, setPriceInr] = useState<number>(0);
  const [score, setScore] = useState<number>(8.5);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("PUBLISHED");
  const [evidenceSource, setEvidenceSource] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load products");
      setProducts(data.products);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setCategory("Water Purifiers");
    setBrand("");
    setSummary("");
    setPriceInr(999);
    setScore(8.5);
    setStatus("PUBLISHED");
    setEvidenceSource("GharSure Lab Testing Batch #2026");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id);
    setTitle(p.title);
    setCategory(p.category);
    setBrand(p.brand);
    setSummary(p.summary || "");
    setPriceInr(Number(p.price_inr));
    setScore(p.score !== null ? Number(p.score) : 8.0);
    setStatus(p.status);
    setEvidenceSource(p.evidence_sources?.[0]?.source || "Lab Testing");
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const evidence = evidenceSource ? [{ source: evidenceSource, type: "LAB_VERIFIED" }] : [];
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          title,
          category,
          brand,
          summary,
          priceInr: Number(priceInr),
          score: Number(score),
          status,
          evidenceSources: evidence,
          specifications: { verified: true },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save product");

      setSuccess(`Product "${title}" saved successfully.`);
      setIsModalOpen(false);
      fetchProducts();
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
            Content & GharSure Scorecards
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative appliance scorecards, verified laboratory testing evidence, and consumer guides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-orange hover:bg-brand-orange-600 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Verified Product</span>
          </button>
          <button
            onClick={() => fetchProducts()}
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

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Score</th>
                <th className="px-5 py-3.5">Product Title</th>
                <th className="px-5 py-3.5">Category & Brand</th>
                <th className="px-5 py-3.5">Price (INR)</th>
                <th className="px-5 py-3.5">Evidence Sources</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading products and scorecards...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No verified products in database.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      {p.score ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-mono font-bold text-xs border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{Number(p.score).toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unrated</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900 max-w-sm">{p.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{p.summary}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{p.brand}</div>
                      <div className="text-[11px] text-slate-400">{p.category}</div>
                    </td>
                    <td className="px-5 py-3 font-mono font-medium text-slate-800">
                      ₹{Number(p.price_inr).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                      {p.evidence_sources?.[0]?.source || "Field Verified"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(p)}
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

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingId ? "Edit Verified Product" : "Add New Verified Product"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Title & Model
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Eureka Forbes Aquaguard Ritz RO+UV"
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="Water Purifiers">Water Purifiers</option>
                    <option value="Testing Equipment">Testing Equipment</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Home Maintenance">Home Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer / Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Eureka Forbes, Bosch"
                    required
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    value={priceInr}
                    onChange={(e) => setPriceInr(Number(e.target.value))}
                    min={0}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GharSure Score (0-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Testing Evidence Source
                </label>
                <input
                  type="text"
                  value={evidenceSource}
                  onChange={(e) => setEvidenceSource(e.target.value)}
                  placeholder="e.g. BIS IS 10500 Compliant Lab Testing Batch #2026"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Summary & Assessment
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  placeholder="Summary of performance under Cauvery & Borewell water conditions..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
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
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
