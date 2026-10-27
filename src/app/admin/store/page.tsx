"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  X,
  Gift,
  Boxes,
  Cpu,
  Wrench,
  Search,
  ShieldCheck,
  Coins,
  ArrowUpDown,
} from "lucide-react";

interface AdminProduct {
  id: string;
  title: string;
  category: string;
  brand: string;
  summary: string;
  price_inr: number | string;
  coin_price: number;
  product_type: "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT";
  inventory_stock: number;
  is_featured: boolean;
  score: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  specifications?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface StoreMetrics {
  total: number;
  gharsureCount: number;
  trialCount: number;
  generalCount: number;
  publishedCount: number;
}

export default function AdminStorePage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [metrics, setMetrics] = useState<StoreMetrics>({
    total: 0,
    gharsureCount: 0,
    trialCount: 0,
    generalCount: 0,
    publishedCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter state
  const [activeTab, setActiveTab] = useState<"ALL" | "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [productType, setProductType] = useState<"GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT">("GHARSURE_PRODUCT");
  const [priceInr, setPriceInr] = useState<number>(0);
  const [coinPrice, setCoinPrice] = useState<number>(0);
  const [inventoryStock, setInventoryStock] = useState<number>(100);
  const [score, setScore] = useState<string>("9.0");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/store");
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load store catalog");
      setProducts(data.products || []);
      if (data.metrics) setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenCreate = (defaultType?: "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT") => {
    setEditingId(null);
    const chosenType = defaultType || (activeTab === "ALL" ? "GHARSURE_PRODUCT" : activeTab);
    setProductType(chosenType);
    setTitle("");
    setBrand(chosenType === "GHARSURE_PRODUCT" ? "GharSure Lab" : "");
    setCategory(chosenType === "TRIAL" ? "Trial Kits" : "Diagnostics");
    setSummary("");
    setPriceInr(chosenType === "TRIAL" ? 0 : 999);
    setCoinPrice(chosenType === "TRIAL" ? 0 : 0);
    setInventoryStock(100);
    setScore("9.2");
    setStatus("PUBLISHED");
    setIsFeatured(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: AdminProduct) => {
    setEditingId(p.id);
    setProductType(p.product_type || "GENERAL_PRODUCT");
    setTitle(p.title);
    setBrand(p.brand || "");
    setCategory(p.category || "");
    setSummary(p.summary || "");
    setPriceInr(Number(p.price_inr) || 0);
    setCoinPrice(p.coin_price ?? 0);
    setInventoryStock(p.inventory_stock ?? 100);
    setScore(p.score !== null ? String(p.score) : "");
    setStatus(p.status || "PUBLISHED");
    setIsFeatured(Boolean(p.is_featured));
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
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
          brand,
          category,
          summary,
          productType,
          priceInr: Number(priceInr),
          coinPrice: Number(coinPrice),
          inventoryStock: Number(inventoryStock),
          score: score ? parseFloat(score) : null,
          status,
          isFeatured,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save product");

      setSuccess(`Product "${title}" saved successfully.`);
      setTimeout(() => setSuccess(""), 4000);
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/store?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete product");
      setSuccess(`Deleted product "${title}".`);
      setTimeout(() => setSuccess(""), 4000);
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchType = activeTab === "ALL" || p.product_type === activeTab;
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.summary?.toLowerCase().includes(q);
      return matchType && matchStatus && matchQuery;
    });
  }, [products, activeTab, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-brand-purple bg-purple-50 px-2 py-0.5 rounded border border-purple-200 uppercase tracking-wider">
              Admin Catalog Engine
            </span>
            <span className="text-xs text-slate-400">3 Store Sections</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Store Management & 3-Section Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage GharSure branded diagnostics, zero-cost coin trial campaigns, and general appliance spares.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreate()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-purple hover:bg-brand-purple/90 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
          <button
            onClick={() => fetchProducts()}
            className="p-2 rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Catalog Items
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {metrics.total}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
              {metrics.publishedCount} Published
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-purple-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">
              GharSure Products
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {metrics.gharsureCount}
            </div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">₹ INR Pricing</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-amber-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
              Coin-Based Trials
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {metrics.trialCount}
            </div>
            <div className="text-[10px] text-amber-700 font-medium mt-0.5">GharSure Coins</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Gift className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              General Spares
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {metrics.generalCount}
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Multi-Brand Spares</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Tabs and Controls */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Section Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("GHARSURE_PRODUCT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "GHARSURE_PRODUCT"
                ? "bg-brand-purple text-white"
                : "text-slate-600 hover:bg-purple-50 hover:text-brand-purple"
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>GharSure Products ({metrics.gharsureCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("TRIAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "TRIAL"
                ? "bg-amber-600 text-white"
                : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"
            }`}
          >
            <Gift className="w-3 h-3" />
            <span>Trials (Coins) ({metrics.trialCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("GENERAL_PRODUCT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "GENERAL_PRODUCT"
                ? "bg-slate-700 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Wrench className="w-3 h-3" />
            <span>General Spares ({metrics.generalCount})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:border-brand-purple"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-purple mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading catalog items...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-700">No Items Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No items matching "${searchQuery}".`
                : "No products exist for this section yet. Click 'Add Item' to create one."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-3">Section</th>
                  <th className="py-3 px-3">Pricing / Cost</th>
                  <th className="py-3 px-3">Inventory</th>
                  <th className="py-3 px-3">Lab Score</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const price = Number(p.price_inr) || 0;
                  const isTrial = p.product_type === "TRIAL";
                  const isGharsure = p.product_type === "GHARSURE_PRODUCT";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{p.title}</span>
                          {p.is_featured && (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {p.brand} · {p.category}
                        </div>
                        {p.summary && (
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                            {p.summary}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        {isGharsure ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <Cpu className="w-3 h-3" />
                            <span>GharSure Product</span>
                          </span>
                        ) : isTrial ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Gift className="w-3 h-3" />
                            <span>Coin Trial Kit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Wrench className="w-3 h-3" />
                            <span>General Spares</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono">
                        {isTrial ? (
                          <div>
                            <span className="text-amber-800 font-bold">
                              {(p.coin_price ?? 0) === 0 ? "0 Coins (Free)" : `${p.coin_price} Coins`}
                            </span>
                            {price > 0 && (
                              <span className="text-[10px] text-slate-400 block">
                                MRP: ₹{price.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900">
                            ₹{price.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`font-mono text-xs font-semibold ${
                            (p.inventory_stock ?? 0) < 15 ? "text-rose-600" : "text-slate-700"
                          }`}
                        >
                          {p.inventory_stock ?? 0} units
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        {p.score ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{Number(p.score).toFixed(1)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            p.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.status === "DRAFT"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-purple hover:bg-slate-100 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Product"
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT PRODUCT MODAL                                                  */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-purple/10 text-brand-purple flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? "Edit Catalog Item" : "Create New Catalog Item"}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure item for store sections</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* SECTION SELECTION */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Store Section *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProductType("GHARSURE_PRODUCT");
                      if (!brand) setBrand("GharSure Lab");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      productType === "GHARSURE_PRODUCT"
                        ? "border-brand-purple bg-purple-50/70 text-brand-purple font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Cpu className="w-4 h-4 mb-1" />
                    <div className="text-[11px]">GharSure Product</div>
                    <div className="text-[9px] text-slate-400 font-normal">₹ INR Purchase</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProductType("TRIAL");
                      setCategory("Trial Kits");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      productType === "TRIAL"
                        ? "border-amber-500 bg-amber-50/70 text-amber-800 font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Gift className="w-4 h-4 mb-1" />
                    <div className="text-[11px]">Trials & Samples</div>
                    <div className="text-[9px] text-slate-400 font-normal">Coin Redemption</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductType("GENERAL_PRODUCT")}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      productType === "GENERAL_PRODUCT"
                        ? "border-slate-800 bg-slate-100 text-slate-900 font-bold shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Wrench className="w-4 h-4 mb-1" />
                    <div className="text-[11px]">General Products</div>
                    <div className="text-[9px] text-slate-400 font-normal">Multi-Brand Spares</div>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GharSure Smart Water Hardness (TDS) Tester"
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              {/* Brand and Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. GharSure Lab, PurePro"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Lab Diagnostics, Water Purifiers"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              {/* Pricing section based on product type */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {productType === "TRIAL" ? (
                  <>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-600" />
                        <span>Coin Cost *</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={coinPrice}
                        onChange={(e) => setCoinPrice(Number(e.target.value))}
                        placeholder="0 for Free Trial"
                        className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-brand-purple font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">0 = ₹0 Free Trial</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Optional MRP (₹ INR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={priceInr}
                        onChange={(e) => setPriceInr(Number(e.target.value))}
                        placeholder="199"
                        className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-brand-purple font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Price (₹ INR) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={priceInr}
                        onChange={(e) => setPriceInr(Number(e.target.value))}
                        placeholder="699"
                        className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-brand-purple font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Coin Equivalent (Optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={coinPrice}
                        onChange={(e) => setCoinPrice(Number(e.target.value))}
                        placeholder="0"
                        className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:border-brand-purple font-mono"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Stock and Score */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Inventory Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={inventoryStock}
                    onChange={(e) => setInventoryStock(Number(e.target.value))}
                    placeholder="100"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Lab Score (0.0 - 10.0)
                  </label>
                  <input
                    type="text"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="9.4"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>
              </div>

              {/* Status and Featured */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Catalog Status *
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white"
                  >
                    <option value="PUBLISHED">Published (Visible in Store)</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-slate-300 text-brand-purple focus:ring-brand-purple"
                  />
                  <label htmlFor="isFeatured" className="text-slate-700 font-semibold cursor-pointer">
                    Highlight as Featured Item
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Summary Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Detailed specifications, warranty, or application..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    <span>{editingId ? "Update Item" : "Create Item"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
