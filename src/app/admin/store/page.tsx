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
  Flame,
  Sparkles,
  Ban,
  Tag,
  Image as ImageIcon,
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
  is_hot_pick?: boolean;
  is_recommended?: boolean;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  discount_percent?: number;
  display_order?: number;
  image_url?: string;
  score: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "STRUCK_OFF";
  strike_off_reason?: string;
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

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [productType, setProductType] = useState<"GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT">("GHARSURE_PRODUCT");
  const [priceInr, setPriceInr] = useState<number>(0);
  const [coinPrice, setCoinPrice] = useState<number>(0);
  const [inventoryStock, setInventoryStock] = useState<number>(100);
  const [score, setScore] = useState<string>("9.0");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED" | "STRUCK_OFF">("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [isHotPick, setIsHotPick] = useState<boolean>(false);
  const [isRecommended, setIsRecommended] = useState<boolean>(false);
  const [isNewArrival, setIsNewArrival] = useState<boolean>(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Strike Off Listing Modal State
  const [strikeOffProduct, setStrikeOffProduct] = useState<AdminProduct | null>(null);
  const [strikeOffReason, setStrikeOffReason] = useState("");
  const [isStrikingOff, setIsStrikingOff] = useState(false);

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
    setCategory(chosenType === "TRIAL" ? "Trial Kits" : "Smart Home");
    setSummary("");
    setImageUrl("");
    setPriceInr(chosenType === "TRIAL" ? 0 : 999);
    setCoinPrice(chosenType === "TRIAL" ? 0 : 0);
    setInventoryStock(100);
    setScore("9.2");
    setStatus("PUBLISHED");
    setIsFeatured(false);
    setIsHotPick(false);
    setIsRecommended(false);
    setIsNewArrival(true);
    setDiscountPercent(0);
    setDisplayOrder(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: AdminProduct) => {
    setEditingId(p.id);
    setTitle(p.title);
    setBrand(p.brand);
    setCategory(p.category);
    setSummary(p.summary || "");
    setImageUrl(p.image_url || "");
    setProductType(p.product_type);
    setPriceInr(Number(p.price_inr) || 0);
    setCoinPrice(Number(p.coin_price) || 0);
    setInventoryStock(p.inventory_stock ?? 100);
    setScore(p.score !== null ? String(p.score) : "");
    setStatus(p.status || "PUBLISHED");
    setIsFeatured(Boolean(p.is_featured));
    setIsHotPick(Boolean(p.is_hot_pick));
    setIsRecommended(Boolean(p.is_recommended));
    setIsNewArrival(Boolean(p.is_new_arrival));
    setDiscountPercent(Number(p.discount_percent) || 0);
    setDisplayOrder(Number(p.display_order) || 0);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          title: title.trim(),
          brand: brand.trim(),
          category: category.trim(),
          summary: summary.trim(),
          imageUrl: imageUrl.trim() || undefined,
          productType,
          priceInr: Number(priceInr),
          coinPrice: Number(coinPrice),
          inventoryStock: Number(inventoryStock),
          score: score ? parseFloat(score) : null,
          status,
          isFeatured,
          isHotPick,
          isRecommended,
          isNewArrival,
          discountPercent: Number(discountPercent),
          displayOrder: Number(displayOrder),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save product");

      setSuccess(editingId ? "Product updated successfully!" : "Product created successfully!");
      setIsModalOpen(false);
      fetchProducts();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Fast Merchandising Toggle
  const handleToggleMerchandising = async (
    p: AdminProduct,
    field: "is_hot_pick" | "is_recommended" | "is_featured" | "is_new_arrival"
  ) => {
    const nextVal = !p[field];
    try {
      const res = await fetch("/api/admin/store/merchandising", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: p.id,
          [field === "is_hot_pick" ? "isHotPick" : field === "is_recommended" ? "isRecommended" : field === "is_featured" ? "isFeatured" : "isNewArrival"]: nextVal,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update merchandising");

      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, [field]: nextVal } : item))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Strike Off Action
  const handleConfirmStrikeOff = async () => {
    if (!strikeOffProduct) return;
    setIsStrikingOff(true);
    setError("");

    try {
      const res = await fetch("/api/admin/store/strike-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: strikeOffProduct.id,
          reason: strikeOffReason.trim() || "Struck off by administrator",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to strike off listing");

      setSuccess(`Listing "${strikeOffProduct.title}" struck off and deactivated.`);
      setStrikeOffProduct(null);
      setStrikeOffReason("");
      fetchProducts();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsStrikingOff(false);
    }
  };

  const handleDeleteProduct = async (id: string, prodTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${prodTitle}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/store?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete product");
      setSuccess("Product deleted successfully.");
      fetchProducts();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchType = activeTab === "ALL" || p.product_type === activeTab;
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.summary?.toLowerCase().includes(q);
      return matchType && matchStatus && matchQuery;
    });
  }, [products, activeTab, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* HEADER & TOP CONTROLS                                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Store & Catalog Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin controls for product catalog, stock levels, hot picks merchandising, and listing deactivations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProducts()}
            disabled={isLoading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => handleOpenCreate()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-purple hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* METRIC CARDS                                                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Catalog</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{metrics.total}</span>
          <span className="text-[11px] text-slate-500">{metrics.publishedCount} Published</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">GharSure Hardware</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{metrics.gharsureCount}</span>
          <span className="text-[11px] text-purple-600 font-medium">Lab Calibrated</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Doorstep Trials</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{metrics.trialCount}</span>
          <span className="text-[11px] text-amber-600 font-medium">Coin Redemptions</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">General Spares</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">{metrics.generalCount}</span>
          <span className="text-[11px] text-slate-500">Retail Inventory</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CATALOG FILTER TABS & SEARCH                                              */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Type Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("GHARSURE_PRODUCT")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "GHARSURE_PRODUCT" ? "bg-purple-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            GharSure ({metrics.gharsureCount})
          </button>
          <button
            onClick={() => setActiveTab("TRIAL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "TRIAL" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Trial Kits ({metrics.trialCount})
          </button>
          <button
            onClick={() => setActiveTab("GENERAL_PRODUCT")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === "GENERAL_PRODUCT" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Spares ({metrics.generalCount})
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            <option value="STRUCK_OFF">Struck Off</option>
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRODUCTS DATA TABLE                                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
            <span className="text-xs">Loading product inventory...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">No products match your active filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Price / Coins</th>
                  <th className="py-3 px-3">Merchandising</th>
                  <th className="py-3 px-3">Inventory</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const price = Number(p.price_inr) || 0;
                  const isTrial = p.product_type === "TRIAL";
                  const isGharsure = p.product_type === "GHARSURE_PRODUCT";
                  const isStruckOff = p.status === "STRUCK_OFF";

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isStruckOff ? "bg-rose-50/30 opacity-75" : ""
                      }`}
                    >
                      {/* Product Details & Photo */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{p.title}</span>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              {p.brand} • {p.category}
                            </span>
                            {p.strike_off_reason && (
                              <span className="text-[10px] text-rose-600 block mt-0.5 italic">
                                Reason: {p.strike_off_reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-3">
                        {isGharsure ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <Cpu className="w-3 h-3" />
                            <span>GharSure</span>
                          </span>
                        ) : isTrial ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Gift className="w-3 h-3" />
                            <span>Trial Kit</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Wrench className="w-3 h-3" />
                            <span>Spares</span>
                          </span>
                        )}
                      </td>

                      {/* Price / Coins */}
                      <td className="py-3.5 px-3 font-mono">
                        {isTrial ? (
                          <span className="text-amber-800 font-bold block">
                            {(p.coin_price ?? 0) === 0 ? "Free Trial" : `${p.coin_price} Coins`}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-900 block">₹{price.toLocaleString("en-IN")}</span>
                        )}
                      </td>

                      {/* Quick Merchandising Controls */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleMerchandising(p, "is_hot_pick")}
                            className={`p-1 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-0.5 ${
                              p.is_hot_pick
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-transparent"
                            }`}
                            title="Toggle Hot Pick highlight"
                          >
                            <Flame className="w-3 h-3" />
                            <span>Hot</span>
                          </button>

                          <button
                            onClick={() => handleToggleMerchandising(p, "is_recommended")}
                            className={`p-1 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-0.5 ${
                              p.is_recommended
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-transparent"
                            }`}
                            title="Toggle Recommended"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Rec</span>
                          </button>

                          <button
                            onClick={() => handleToggleMerchandising(p, "is_featured")}
                            className={`p-1 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-0.5 ${
                              p.is_featured
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-transparent"
                            }`}
                            title="Toggle Featured"
                          >
                            <span>Feat</span>
                          </button>
                        </div>
                      </td>

                      {/* Inventory */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-mono font-bold ${
                            p.inventory_stock <= 10 ? "text-rose-600" : "text-slate-700"
                          }`}
                        >
                          {p.inventory_stock} units
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            p.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.status === "DRAFT"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : p.status === "STRUCK_OFF"
                              ? "bg-rose-100 text-rose-800 border border-rose-300 font-black"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {p.status === "STRUCK_OFF" ? "STRUCK OFF" : p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand-purple hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isStruckOff && (
                            <button
                              onClick={() => {
                                setStrikeOffProduct(p);
                                setStrikeOffReason("");
                              }}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Strike Off / Remove Listing"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
      {/* STRIKE OFF LISTING CONFIRMATION MODAL                                    */}
      {/* ========================================================================= */}
      {strikeOffProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Ban className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Strike Off Listing</h3>
              </div>
              <button
                onClick={() => setStrikeOffProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                You are about to strike off and deactivate{" "}
                <span className="font-bold text-slate-900">"{strikeOffProduct.title}"</span>.
              </p>
              <p className="text-[11px] text-slate-400">
                This safely removes the product from customer discovery and prevents any new orders, while preserving historical orders, inventory logs, and ledger integrity.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 text-xs">
                Administrative Reason for Strike Off *
              </label>
              <textarea
                rows={3}
                required
                value={strikeOffReason}
                onChange={(e) => setStrikeOffReason(e.target.value)}
                placeholder="e.g. Vendor supply chain disruption, safety recall, or lab recalibration..."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStrikeOffProduct(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStrikeOff}
                disabled={isStrikingOff || !strikeOffReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isStrikingOff && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Strike Off</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT PRODUCT MODAL                                                  */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-purple" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingId ? "Edit Catalog Item" : "Create New Catalog Product"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Product Type & Brand */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Product Type *</label>
                  <select
                    value={productType}
                    onChange={(e: any) => setProductType(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white"
                  >
                    <option value="GHARSURE_PRODUCT">GharSure Hardware</option>
                    <option value="TRIAL">Doorstep Trial Kit (Coin Redeemable)</option>
                    <option value="GENERAL_PRODUCT">General Spares / Consumables</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. GharSure Lab, CleanFlow"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Eco Surface Deep Clean Concentrate"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Smart Home, Home Care, Trial Kits"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              {/* Pricing & Coins */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={priceInr}
                    onChange={(e) => setPriceInr(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Coin Price</label>
                  <input
                    type="number"
                    min="0"
                    value={coinPrice}
                    onChange={(e) => setCoinPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Stock Level *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={inventoryStock}
                    onChange={(e) => setInventoryStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>
              </div>

              {/* Merchandising Checkboxes */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                  Store Merchandising & Highlights
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={isHotPick}
                      onChange={(e) => setIsHotPick(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Hot Pick</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={isRecommended}
                      onChange={(e) => setIsRecommended(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Recommended</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Featured</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={isNewArrival}
                      onChange={(e) => setIsNewArrival(e.target.checked)}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>New Arrival</span>
                  </label>
                </div>
              </div>

              {/* Status and Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Catalog Status *</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple bg-white"
                  >
                    <option value="PUBLISHED">Published (Visible in Store)</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                    <option value="STRUCK_OFF">Struck Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Display Priority Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple font-mono"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Summary Description *</label>
                <textarea
                  rows={3}
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Detailed specifications, application instructions, and benefits..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-brand-purple"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-brand-purple hover:bg-purple-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingId ? "Save Changes" : "Create Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
