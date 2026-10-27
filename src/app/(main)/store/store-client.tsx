"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  ShoppingBag,
  Info,
  Gift,
  Coins,
  Loader2,
} from "lucide-react";

export interface ProductItem {
  id: string;
  title: string;
  summary: string;
  price_inr: string | number;
  coin_price?: number;
  brand: string;
  category: string;
  product_type?: "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT" | string;
  inventory_stock?: number;
  is_featured?: boolean;
  score: number | null;
  specifications?: Record<string, any>;
  scorecard_details?: Record<string, any>;
  evidence_sources?: Array<{ source: string; type: string }>;
}

interface StoreClientViewProps {
  initialProducts: ProductItem[];
  userCoins: number;
  isLoggedIn: boolean;
}

export function StoreClientView({
  initialProducts,
  userCoins: initialCoins,
  isLoggedIn,
}: StoreClientViewProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [userCoins, setUserCoins] = useState<number>(initialCoins);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT">("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // Group products by section
  const gharsureProducts = useMemo(
    () => products.filter((p) => p.product_type === "GHARSURE_PRODUCT"),
    [products]
  );
  const trialProducts = useMemo(
    () => products.filter((p) => p.product_type === "TRIAL"),
    [products]
  );
  const generalProducts = useMemo(
    () => products.filter((p) => p.product_type === "GENERAL_PRODUCT" || !p.product_type),
    [products]
  );

  const matchesSearch = (p: ProductItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  };

  const filteredGharsure = useMemo(() => gharsureProducts.filter(matchesSearch), [gharsureProducts, searchQuery]);
  const filteredTrials = useMemo(() => trialProducts.filter(matchesSearch), [trialProducts, searchQuery]);
  const filteredGeneral = useMemo(() => generalProducts.filter(matchesSearch), [generalProducts, searchQuery]);

  const handleAddToCart = (product: ProductItem) => {
    setFeedback(`Added "${product.title}" to order basket.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRedeemTrial = async (trial: ProductItem) => {
    if (!isLoggedIn) {
      window.location.href = "/auth";
      return;
    }

    const cost = trial.coin_price ?? 0;
    if (userCoins < cost) {
      setFeedback(`Insufficient coins (${userCoins} / ${cost} needed).`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setRedeemingId(trial.id);
    try {
      const res = await fetch("/api/store/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: trial.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Redemption failed");

      setUserCoins(data.newBalance ?? Math.max(0, userCoins - cost));
      setFeedback(`Order confirmed for "${trial.title}"!`);
      setTimeout(() => setFeedback(null), 4000);

      setProducts((prev) =>
        prev.map((item) =>
          item.id === trial.id
            ? { ...item, inventory_stock: Math.max(0, (item.inventory_stock ?? 1) - 1) }
            : item
        )
      );
    } catch (err: any) {
      setFeedback(err.message || "Failed to redeem trial");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="space-y-5 w-full max-w-5xl mx-auto pb-20 select-none">
      {/* Clean Header: Title + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Store</h1>

        <div className="flex items-center gap-2">
          {/* Section Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("GHARSURE_PRODUCT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "GHARSURE_PRODUCT"
                  ? "bg-brand-purple text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-brand-purple"
              }`}
            >
              GharSure Products
            </button>
            <button
              onClick={() => setActiveTab("TRIAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "TRIAL"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-800"
              }`}
            >
              Trials (Coins)
            </button>
            <button
              onClick={() => setActiveTab("GENERAL_PRODUCT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === "GENERAL_PRODUCT"
                  ? "bg-slate-700 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              General Products
            </button>
          </div>

          {/* Compact Search */}
          <div className="relative w-44 sm:w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-purple"
            />
          </div>
        </div>
      </div>

      {/* Floating Feedback Alert */}
      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. GHARSURE PRODUCTS */}
      {(activeTab === "ALL" || activeTab === "GHARSURE_PRODUCT") && (
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">GharSure Products</h2>
            <span className="text-xs font-semibold text-slate-400">{filteredGharsure.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGharsure.map((product) => {
              const price = Number(product.price_inr) || 0;
              const score = product.score ? Number(product.score).toFixed(1) : null;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-brand-purple">
                        {product.brand} · {product.category}
                      </span>
                      {score && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{score}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 leading-snug">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {product.summary}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
                      >
                        Specs
                      </button>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="px-3 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Order</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. TRIALS (COINS) */}
      {(activeTab === "ALL" || activeTab === "TRIAL") && (
        <section className="space-y-3 pt-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Trials (Coins)</h2>
            <span className="text-xs font-semibold text-slate-400">{filteredTrials.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTrials.map((trial) => {
              const cost = trial.coin_price ?? 0;
              const canAfford = userCoins >= cost;
              const isRedeeming = redeemingId === trial.id;

              return (
                <div
                  key={trial.id}
                  className="bg-white rounded-xl p-4 border border-amber-200/90 hover:border-amber-300 transition-all flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {trial.brand} · {trial.category}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                        <Coins className="w-3 h-3 text-amber-600" />
                        <span>{cost === 0 ? "Free Trial" : `${cost} Coins`}</span>
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 leading-snug">
                      {trial.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {trial.summary}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold font-mono text-amber-900">
                        {cost === 0 ? "0 Coins" : `${cost} Coins`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedProduct(trial)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
                      >
                        Specs
                      </button>
                      <button
                        onClick={() => handleRedeemTrial(trial)}
                        disabled={isRedeeming || !canAfford}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer ${
                          canAfford
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {isRedeeming ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Gift className="w-3 h-3" />
                        )}
                        <span>{cost === 0 ? "Claim Free" : `Redeem (${cost})`}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. GENERAL PRODUCTS */}
      {(activeTab === "ALL" || activeTab === "GENERAL_PRODUCT") && (
        <section className="space-y-3 pt-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">General Products</h2>
            <span className="text-xs font-semibold text-slate-400">{filteredGeneral.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGeneral.map((product) => {
              const price = Number(product.price_inr) || 0;
              const score = product.score ? Number(product.score).toFixed(1) : null;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {product.brand} · {product.category}
                      </span>
                      {score && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{score}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1 leading-snug">
                      {product.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                      {product.summary}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded"
                      >
                        Specs
                      </button>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Order</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Specifications Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 border border-slate-200 animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-900 uppercase">Specifications</span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  {selectedProduct.brand}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{selectedProduct.title}</h3>
                <p className="text-slate-600 mt-1 leading-relaxed">{selectedProduct.summary}</p>
              </div>

              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                    <div key={k} className="p-2.5 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-900 font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
