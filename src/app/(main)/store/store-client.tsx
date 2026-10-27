"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  PackageOpen,
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  ShoppingBag,
  Info,
  Coins,
  Sparkles,
  Gift,
  Wrench,
  Cpu,
  ArrowRight,
  Loader2,
  Truck,
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
  const [activeSectionTab, setActiveSectionTab] = useState<"ALL" | "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT">("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Trial redemption state
  const [redeemingTrialId, setRedeemingTrialId] = useState<string | null>(null);
  const [confirmModalTrial, setConfirmModalTrial] = useState<ProductItem | null>(null);
  const [isSubmittingRedeem, setIsSubmittingRedeem] = useState(false);

  // Grouped products
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

  // Filter helper for search query
  const matchesSearch = (p: ProductItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.summary?.toLowerCase().includes(q)
    );
  };

  const filteredGharsure = useMemo(() => gharsureProducts.filter(matchesSearch), [gharsureProducts, searchQuery]);
  const filteredTrials = useMemo(() => trialProducts.filter(matchesSearch), [trialProducts, searchQuery]);
  const filteredGeneral = useMemo(() => generalProducts.filter(matchesSearch), [generalProducts, searchQuery]);

  // Handle standard INR cart addition
  const handleAddToCart = (product: ProductItem) => {
    setFeedbackMessage({
      type: "success",
      text: `Added "${product.title}" to order basket (₹${Number(product.price_inr).toLocaleString("en-IN")}).`,
    });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Handle trial coin redemption
  const handleRedeemTrial = async (trial: ProductItem) => {
    if (!isLoggedIn) {
      window.location.href = "/auth";
      return;
    }

    const coinCost = trial.coin_price ?? 0;
    if (userCoins < coinCost) {
      setFeedbackMessage({
        type: "error",
        text: `Insufficient coins. You need ${coinCost} coins but have ${userCoins}. Earn more coins via surveys!`,
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
      return;
    }

    setIsSubmittingRedeem(true);
    setRedeemingTrialId(trial.id);

    try {
      const res = await fetch("/api/store/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: trial.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to redeem trial");
      }

      setUserCoins(data.newBalance ?? Math.max(0, userCoins - coinCost));
      setConfirmModalTrial(null);
      setFeedbackMessage({
        type: "success",
        text: data.message || `Redeemed "${trial.title}" successfully! Free doorstep delivery dispatched.`,
      });
      setTimeout(() => setFeedbackMessage(null), 6000);

      // Decrement local inventory stock
      setProducts((prev) =>
        prev.map((item) =>
          item.id === trial.id
            ? { ...item, inventory_stock: Math.max(0, (item.inventory_stock ?? 1) - 1) }
            : item
        )
      );
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err.message || "Redemption failed." });
      setTimeout(() => setFeedbackMessage(null), 5000);
    } finally {
      setIsSubmittingRedeem(false);
      setRedeemingTrialId(null);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto pb-16">
      {/* Store Header with Live Coin Balance */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-purple bg-purple-50 px-2.5 py-0.5 rounded border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>GharSure Verified Store</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">3 Dedicated Sections</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Store & Community Trials
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Explore GharSure home diagnostics, zero-cost trial kits bought using reward coins, and certified OEM spares.
          </p>
        </div>

        {/* User Coin Balance Widget */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shrink-0 self-start md:self-auto min-w-[220px]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                GharSure Coins
              </div>
              <div className="text-base font-bold font-mono text-slate-900 leading-tight">
                {userCoins.toLocaleString()} <span className="text-xs font-normal text-slate-500">Coins</span>
              </div>
            </div>
          </div>

          <Link
            href="/rewards"
            className="text-[11px] font-bold text-brand-purple hover:underline flex items-center gap-0.5"
            title="Earn coins with surveys"
          >
            <span>Earn</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Floating Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                feedbackMessage.type === "success" ? "text-emerald-600" : "text-rose-600"
              }`}
            />
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* 3-Section Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSectionTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>All Sections</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSectionTab("GHARSURE_PRODUCT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === "GHARSURE_PRODUCT"
                ? "bg-brand-purple text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-purple-50/50 hover:text-brand-purple"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>GharSure Products</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
              {gharsureProducts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSectionTab("TRIAL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === "TRIAL"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-amber-50/50 hover:text-amber-700"
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Trials (Using Coins)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {trialProducts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSectionTab("GENERAL_PRODUCT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSectionTab === "GENERAL_PRODUCT"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>General Products</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {generalProducts.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, brands, parts..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-purple transition-colors"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: GHARSURE PRODUCTS                                             */}
      {/* ========================================================================= */}
      {(activeSectionTab === "ALL" || activeSectionTab === "GHARSURE_PRODUCT") && (
        <section className="space-y-3 pt-2">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-brand-purple flex items-center justify-center font-bold">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>GharSure Products</span>
                  <span className="text-[10px] font-semibold text-brand-purple bg-purple-50 px-2 py-0.2 rounded border border-purple-200">
                    Lab Verified
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Precision digital hardness testers, IoT telemetry water monitors, and magnetic scale conditioners.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-brand-purple shrink-0">
              Purchased in ₹ INR
            </span>
          </div>

          {filteredGharsure.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-xs text-slate-500">
              No GharSure Products match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredGharsure.map((product) => {
                const price = Number(product.price_inr) || 0;
                const score = product.score ? Number(product.score).toFixed(1) : null;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl p-4 sm:p-5 border border-purple-200/80 hover:border-purple-300 transition-all flex flex-col justify-between shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-brand-purple uppercase tracking-wider">
                          {product.brand} · {product.category}
                        </span>
                        {score && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{score} Score</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-brand-purple transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
                        {product.summary}
                      </p>

                      {/* Specifications Preview */}
                      {product.specifications && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {Object.entries(product.specifications).slice(0, 2).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-medium bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-100"
                            >
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Direct Purchase
                          </span>
                          <span className="text-base font-bold font-mono text-slate-900">
                            ₹{price.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Specs</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full h-8 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Order Device (₹{price.toLocaleString("en-IN")})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: TRIALS & SAMPLES (BOUGHT USING GHARSURE COINS)                 */}
      {/* ========================================================================= */}
      {(activeSectionTab === "ALL" || activeSectionTab === "TRIAL") && (
        <section className="space-y-3 pt-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Trials & Sample Kits</span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.2 rounded border border-amber-200 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-600" />
                    <span>Bought Using Coins</span>
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Zero-cost trial kits and samples redeemed directly using your GharSure Coins with free doorstep delivery.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-center">
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>Doorstep Dispatch Included</span>
            </div>
          </div>

          {filteredTrials.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-xs text-slate-500">
              No Trial Kits match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredTrials.map((trial) => {
                const coinCost = trial.coin_price ?? 0;
                const canAfford = userCoins >= coinCost;
                const isOutOfStock = (trial.inventory_stock ?? 1) <= 0;
                const isRedeeming = redeemingTrialId === trial.id;

                return (
                  <div
                    key={trial.id}
                    className="bg-white rounded-xl p-4 sm:p-5 border border-amber-200 hover:border-amber-300 transition-all flex flex-col justify-between shadow-2xs group relative"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">
                          {trial.brand} · {trial.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                            coinCost === 0
                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                              : "text-amber-800 bg-amber-50 border border-amber-200"
                          }`}
                        >
                          <Coins className="w-3 h-3 text-amber-600" />
                          <span>{coinCost === 0 ? "₹0 Free Trial" : `${coinCost} Coins`}</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-amber-800 transition-colors">
                        {trial.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
                        {trial.summary}
                      </p>

                      {/* Stock availability */}
                      <div className="flex items-center gap-2 mb-3 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-500">
                          {trial.inventory_stock !== undefined
                            ? `${trial.inventory_stock} units left in stock`
                            : "Available for claim"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Coin Cost
                          </span>
                          <span className="text-base font-bold font-mono text-amber-800">
                            {coinCost === 0 ? "FREE (0 Coins)" : `${coinCost} Coins`}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedProduct(trial)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </div>

                      {/* Action Button */}
                      {!isLoggedIn ? (
                        <Link
                          href="/auth"
                          className="w-full h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Login to Claim Trial</span>
                        </Link>
                      ) : isOutOfStock ? (
                        <button
                          disabled
                          className="w-full h-8 rounded-lg bg-slate-100 text-slate-400 font-semibold text-xs cursor-not-allowed flex items-center justify-center"
                        >
                          Out of Stock
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModalTrial(trial)}
                          disabled={!canAfford || isRedeeming}
                          className={`w-full h-8 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                            canAfford
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-slate-100 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isRedeeming ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : canAfford ? (
                            <>
                              <Gift className="w-3.5 h-3.5" />
                              <span>{coinCost === 0 ? "Claim Free Trial Kit" : `Redeem for ${coinCost} Coins`}</span>
                            </>
                          ) : (
                            <span>Needs {coinCost} Coins (Have {userCoins})</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: GENERAL PRODUCTS & SPARES                                      */}
      {/* ========================================================================= */}
      {(activeSectionTab === "ALL" || activeSectionTab === "GENERAL_PRODUCT") && (
        <section className="space-y-3 pt-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>General Products & Spares</span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.2 rounded border border-slate-200">
                    OEM Spares
                  </span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  Universal RO cartridges, booster pumps, pre-filter replacement kits, and descalers across major appliance brands.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-600 shrink-0">
              Purchased in ₹ INR
            </span>
          </div>

          {filteredGeneral.length === 0 ? (
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-xs text-slate-500">
              No General Products match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredGeneral.map((product) => {
                const price = Number(product.price_inr) || 0;
                const score = product.score ? Number(product.score).toFixed(1) : null;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase">
                          {product.brand} · {product.category}
                        </span>
                        {score && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>{score} Score</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
                        {product.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Direct Purchase
                          </span>
                          <span className="text-base font-bold font-mono text-slate-900">
                            ₹{price.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Order Part (₹{price.toLocaleString("en-IN")})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* TRIAL REDEMPTION CONFIRMATION MODAL                                       */}
      {/* ========================================================================= */}
      {confirmModalTrial && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-6 border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Confirm Trial Redemption</h3>
                  <span className="text-[10px] text-slate-400">Direct Doorstep Delivery</span>
                </div>
              </div>
              <button
                onClick={() => setConfirmModalTrial(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  {confirmModalTrial.brand}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">{confirmModalTrial.title}</h4>
                <p className="text-slate-500 mt-1 leading-relaxed">{confirmModalTrial.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-center">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase block">Coin Deduction</span>
                  <span className="text-sm font-bold font-mono text-amber-900 mt-0.5 block">
                    {confirmModalTrial.coin_price ?? 0} Coins
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Remaining Balance</span>
                  <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                    {Math.max(0, userCoins - (confirmModalTrial.coin_price ?? 0))} Coins
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-lg">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Free shipping included. Your verified address on file will be used for rapid dispatch.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmModalTrial(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRedeemTrial(confirmModalTrial)}
                disabled={isSubmittingRedeem}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isSubmittingRedeem ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Redeeming...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5" />
                    <span>Confirm & Dispatch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRODUCT SPECIFICATION & DETAILS MODAL                                     */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">Item Intelligence</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  {selectedProduct.brand} · {selectedProduct.category}
                </span>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedProduct.title}
                </h2>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  {selectedProduct.summary}
                </p>
              </div>

              {selectedProduct.score && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">
                      Lab Verification Score
                    </div>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                      {Number(selectedProduct.score).toFixed(1)} / 10.0
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                    Verified OEM
                  </span>
                </div>
              )}

              {/* Specifications */}
              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-700 text-[11px] mb-1">
                    Technical Specifications
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                      <div key={k} className="p-2.5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{k}</span>
                        <span className="text-slate-900 font-semibold text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {selectedProduct.product_type === "TRIAL" ? (
                    <span className="text-sm font-bold font-mono text-amber-800">
                      {(selectedProduct.coin_price ?? 0) === 0 ? "₹0 Free Trial" : `${selectedProduct.coin_price} Coins`}
                    </span>
                  ) : (
                    <span className="text-base font-bold font-mono text-slate-900">
                      ₹{Number(selectedProduct.price_inr).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {selectedProduct.product_type === "TRIAL" ? (
                  <button
                    onClick={() => {
                      const p = selectedProduct;
                      setSelectedProduct(null);
                      setConfirmModalTrial(p);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Redeem Trial</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleAddToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order Part</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
