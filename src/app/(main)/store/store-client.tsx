"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  ShoppingBag,
  Gift,
  Coins,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Cpu,
  Wrench,
  Sparkles,
  Ticket,
  Copy,
  Info,
  Filter,
  Check,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export interface VoucherItem {
  id: string;
  title: string;
  partner: string;
  code: string;
  discount: string;
  validity: string;
  terms: string;
  category: string;
}

interface StoreClientViewProps {
  initialProducts: ProductItem[];
  vouchers: VoucherItem[];
  userCoins: number;
  isLoggedIn: boolean;
}

// Category visual tiles metadata
const categoryTiles = [
  { id: "ALL", label: "All Categories", icon: Package, color: "text-brand-purple bg-purple-50" },
  { id: "Lab Diagnostics", label: "Diagnostics", icon: Droplets, color: "text-blue-600 bg-blue-50" },
  { id: "IoT Monitors", label: "IoT Monitors", icon: Cpu, color: "text-indigo-600 bg-indigo-50" },
  { id: "Trial Kits", label: "Trial Kits", icon: Gift, color: "text-amber-600 bg-amber-50" },
  { id: "Water Purifiers", label: "Purifiers", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
  { id: "Spares", label: "Spares & Filters", icon: Wrench, color: "text-slate-600 bg-slate-100" },
  { id: "Water Conditioners", label: "Conditioners", icon: Sparkles, color: "text-teal-600 bg-teal-50" },
];

export function StoreClientView({
  initialProducts,
  vouchers,
  userCoins: initialCoins,
  isLoggedIn,
}: StoreClientViewProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [userCoins, setUserCoins] = useState<number>(initialCoins);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT" | "VOUCHERS">("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // Group products by product_type
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

  // Search and Category filtering
  const matchesFilter = (p: ProductItem) => {
    // Category filter
    if (selectedCategory !== "ALL") {
      const matchCat = p.category?.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;
    }
    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.summary?.toLowerCase().includes(q)
    );
  };

  const filteredGharsure = useMemo(() => gharsureProducts.filter(matchesFilter), [gharsureProducts, matchesFilter]);
  const filteredTrials = useMemo(() => trialProducts.filter(matchesFilter), [trialProducts, matchesFilter]);
  const filteredGeneral = useMemo(() => generalProducts.filter(matchesFilter), [generalProducts, matchesFilter]);
  const allFiltered = useMemo(() => products.filter(matchesFilter), [products, matchesFilter]);

  const handleAddToCart = (product: ProductItem) => {
    setFeedback(`Order request confirmed for "${product.title}". Delivery dispatched.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleRedeemTrial = async (trial: ProductItem) => {
    if (!isLoggedIn) {
      window.location.href = "/auth";
      return;
    }

    const cost = trial.coin_price ?? 0;
    if (userCoins < cost) {
      setFeedback(`Insufficient coins (${userCoins} available / ${cost} required). Complete surveys to earn more coins.`);
      setTimeout(() => setFeedback(null), 3500);
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
      setFeedback(`Trial kit confirmed! "${trial.title}" will be delivered to your address.`);
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
      setTimeout(() => setFeedback(null), 3500);
    } finally {
      setRedeemingId(null);
    }
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setFeedback(`Voucher code "${code}" copied to clipboard!`);
    setTimeout(() => {
      setCopiedVoucher(null);
      setFeedback(null);
    }, 3000);
  };

  return (
    <div className="w-full space-y-6 pb-20 select-none">
      {/* 1. STORE HEADER: Search, Filters, and Coins */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-brand-purple bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 uppercase tracking-wider">
                GharSure Store
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Verified Diagnostics & Zero-Cost Doorstep Trials
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Product Discovery & Trials
            </h1>
          </div>

          {/* Search bar & Coin Pill */}
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands, diagnostics..."
                className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-brand-purple transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Coin Balance */}
            <Link
              href="/rewards"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 transition-colors shrink-0 shadow-2xs"
              title="Your Available GharSure Coins"
            >
              <Coins className="w-4 h-4 text-amber-600" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-amber-700 font-semibold uppercase leading-none">Coins</span>
                <span className="text-xs font-bold font-mono leading-tight">{userCoins.toLocaleString()}</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Section Tabs (Smytten Style Navigation) */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 overflow-x-auto scrollbar-none">
          <button
            onClick={() => { setActiveTab("ALL"); setSelectedCategory("ALL"); }}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              activeTab === "ALL" && selectedCategory === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All Discover
          </button>
          <button
            onClick={() => setActiveTab("GHARSURE_PRODUCT")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              activeTab === "GHARSURE_PRODUCT"
                ? "bg-brand-purple text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:border-brand-purple hover:text-brand-purple"
            )}
          >
            GharSure Products ({gharsureProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("TRIAL")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1",
              activeTab === "TRIAL"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50"
            )}
          >
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span>Doorstep Trials ({trialProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("GENERAL_PRODUCT")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              activeTab === "GENERAL_PRODUCT"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            General Products & Spares ({generalProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("VOUCHERS")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1",
              activeTab === "VOUCHERS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            )}
          >
            <Ticket className="w-3.5 h-3.5 text-indigo-600" />
            <span>Vouchers & Offers ({vouchers.length})</span>
          </button>
        </div>
      </div>

      {/* Floating Feedback Alert */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. PROMOTIONAL HERO BANNER (Smytten Style) */}
      {activeTab === "ALL" && !searchQuery && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold text-amber-300 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Doorstep Water Research Trials</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Try Lab-Calibrated Water Kits for 0 Coins
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Exchange your earned GharSure survey coins for certified rapid TDS test strips, food-grade citric descalers, and mineral inline filters delivered straight to your door.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab("TRIAL")}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>Explore Zero-Cost Trials</span>
              </button>
              <button
                onClick={() => setActiveTab("GHARSURE_PRODUCT")}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm transition-all backdrop-blur-md border border-white/10 cursor-pointer"
              >
                GharSure Hardware
              </button>
            </div>
          </div>

          {/* Decorative Background Elements */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-brand-purple/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-12 top-6 opacity-10 sm:opacity-20 pointer-events-none">
            <Droplets className="w-48 h-48 text-cyan-300" />
          </div>
        </div>
      )}

      {/* 3. BROWSE CATEGORIES TILES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Browse By Category
          </h2>
          {selectedCategory !== "ALL" && (
            <button
              onClick={() => setSelectedCategory("ALL")}
              className="text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
            >
              Clear Category Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 sm:gap-3">
          {categoryTiles.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveTab("ALL");
                }}
                className={cn(
                  "flex flex-col items-center text-center p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs group",
                  isSelected
                    ? "border-brand-purple bg-purple-50 ring-2 ring-brand-purple/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105",
                    cat.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-1">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. DISCOVER VIEW (Smytten Style: Distinct Horizontal Shelves) */}
      {activeTab === "ALL" && selectedCategory === "ALL" && !searchQuery && (
        <div className="space-y-8">
          {/* SHELF 1: GHARSURE PRODUCTS */}
          {filteredGharsure.length > 0 && (
            <ProductShelf
              title="Featured GharSure Lab Diagnostics & IoT"
              subtitle="Calibrated sensors and diagnostic hardware for residential water health"
              products={filteredGharsure}
              userCoins={userCoins}
              onSpecsClick={setSelectedProduct}
              onOrderClick={handleAddToCart}
              onRedeemClick={handleRedeemTrial}
              redeemingId={redeemingId}
              badgeType="GHARSURE"
              viewAllTab="GHARSURE_PRODUCT"
              onViewAll={() => setActiveTab("GHARSURE_PRODUCT")}
            />
          )}

          {/* SHELF 2: DOORSTEP TRIALS (BOUGHT WITH COINS) */}
          {filteredTrials.length > 0 && (
            <ProductShelf
              title="Doorstep Trials (Redeem with GharSure Coins)"
              subtitle="Zero-cost water test strips and maintenance samples delivered to your apartment"
              products={filteredTrials}
              userCoins={userCoins}
              onSpecsClick={setSelectedProduct}
              onOrderClick={handleAddToCart}
              onRedeemClick={handleRedeemTrial}
              redeemingId={redeemingId}
              badgeType="TRIAL"
              viewAllTab="TRIAL"
              onViewAll={() => setActiveTab("TRIAL")}
            />
          )}

          {/* SHELF 3: GENERAL PRODUCTS & SPARES */}
          {filteredGeneral.length > 0 && (
            <ProductShelf
              title="OEM Water Purifiers & Certified Spares"
              subtitle="Genuine RO membranes, sediment filters, and high-pressure booster pumps"
              products={filteredGeneral}
              userCoins={userCoins}
              onSpecsClick={setSelectedProduct}
              onOrderClick={handleAddToCart}
              onRedeemClick={handleRedeemTrial}
              redeemingId={redeemingId}
              badgeType="GENERAL"
              viewAllTab="GENERAL_PRODUCT"
              onViewAll={() => setActiveTab("GENERAL_PRODUCT")}
            />
          )}

          {/* SHELF 4: VOUCHERS & OFFERS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Exclusive Vouchers & Partner Offers</span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {vouchers.length} Available
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Instant service discounts and complimentary lab testing passes
                </p>
              </div>
              <button
                onClick={() => setActiveTab("VOUCHERS")}
                className="text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
              >
                View All Vouchers
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {vouchers.map((v) => (
                <VoucherCard
                  key={v.id}
                  voucher={v}
                  isCopied={copiedVoucher === v.code}
                  onCopy={handleCopyVoucher}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB-SPECIFIC FULL CATALOG GRIDS */}
      {/* GHARSURE PRODUCTS TAB */}
      {(activeTab === "GHARSURE_PRODUCT" || (activeTab === "ALL" && (selectedCategory !== "ALL" || searchQuery))) && filteredGharsure.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                GharSure Products ({filteredGharsure.length})
              </h2>
              <p className="text-xs text-slate-500">
                Official smart monitors, inline telemetry, and physical water testers
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGharsure.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                userCoins={userCoins}
                onSpecsClick={setSelectedProduct}
                onOrderClick={handleAddToCart}
                onRedeemClick={handleRedeemTrial}
                isRedeeming={redeemingId === p.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* TRIALS TAB */}
      {(activeTab === "TRIAL" || (activeTab === "ALL" && (selectedCategory !== "ALL" || searchQuery))) && filteredTrials.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-amber-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-950 tracking-tight flex items-center gap-2">
                <span>Doorstep Trials — Redeem with Coins</span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {filteredTrials.length} Kits
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Zero monetary cost. Use your research survey coins for free doorstep delivery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTrials.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                userCoins={userCoins}
                onSpecsClick={setSelectedProduct}
                onOrderClick={handleAddToCart}
                onRedeemClick={handleRedeemTrial}
                isRedeeming={redeemingId === p.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* GENERAL PRODUCTS TAB */}
      {(activeTab === "GENERAL_PRODUCT" || (activeTab === "ALL" && (selectedCategory !== "ALL" || searchQuery))) && filteredGeneral.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                General Products & Spares ({filteredGeneral.length})
              </h2>
              <p className="text-xs text-slate-500">
                Water purifiers, standard RO replacement cartridges, and booster pumps
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGeneral.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                userCoins={userCoins}
                onSpecsClick={setSelectedProduct}
                onOrderClick={handleAddToCart}
                onRedeemClick={handleRedeemTrial}
                isRedeeming={redeemingId === p.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* VOUCHERS TAB */}
      {activeTab === "VOUCHERS" && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Vouchers & Offers ({vouchers.length})
              </h2>
              <p className="text-xs text-slate-500">
                Redeem partner vouchers for maintenance discounts and free water analysis
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vouchers.map((v) => (
              <VoucherCard
                key={v.id}
                voucher={v}
                isCopied={copiedVoucher === v.code}
                onCopy={handleCopyVoucher}
              />
            ))}
          </div>
        </section>
      )}

      {/* EMPTY SEARCH OR FILTER STATE */}
      {allFiltered.length === 0 && activeTab !== "VOUCHERS" && (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Matching Products Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            We couldn't find any items matching &ldquo;{searchQuery}&rdquo; in {selectedCategory === "ALL" ? "the catalog" : selectedCategory}.
          </p>
          <button
            onClick={() => { setSearchQuery(""); setSelectedCategory("ALL"); setActiveTab("ALL"); }}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-purple text-white text-xs font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* SPECIFICATIONS & DETAILS MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Product Details & Specs
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-brand-purple uppercase">
                    {selectedProduct.brand}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedProduct.category}
                  </span>
                  {selectedProduct.score && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{Number(selectedProduct.score).toFixed(1)} / 10 Score</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedProduct.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {selectedProduct.summary}
                </p>
              </div>

              {/* Technical Specifications */}
              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Verified Specifications
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                      <div key={k} className="p-2.5 sm:p-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                        <span className="text-slate-900 font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory & Delivery Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Availability</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>In Stock ({selectedProduct.inventory_stock ?? 50} units left)</span>
                </span>
              </div>

              {/* Modal Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Price / Trial Cost</div>
                  {selectedProduct.product_type === "TRIAL" ? (
                    <div className="text-base font-bold font-mono text-amber-900 flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>{selectedProduct.coin_price === 0 ? "Free (0 Coins)" : `${selectedProduct.coin_price} Coins`}</span>
                    </div>
                  ) : (
                    <div className="text-base font-bold font-mono text-slate-900">
                      ₹{Number(selectedProduct.price_inr || 0).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Close
                  </button>

                  {selectedProduct.product_type === "TRIAL" ? (
                    <button
                      onClick={() => {
                        handleRedeemTrial(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      disabled={userCoins < (selectedProduct.coin_price ?? 0)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer",
                        userCoins >= (selectedProduct.coin_price ?? 0)
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>{selectedProduct.coin_price === 0 ? "Claim Free Trial" : `Redeem (${selectedProduct.coin_price} Coins)`}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleAddToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Order Now</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Horizontal Product Shelf (Smytten Pattern)
// -----------------------------------------------------------------------------
interface ProductShelfProps {
  title: string;
  subtitle: string;
  products: ProductItem[];
  userCoins: number;
  onSpecsClick: (p: ProductItem) => void;
  onOrderClick: (p: ProductItem) => void;
  onRedeemClick: (p: ProductItem) => void;
  redeemingId: string | null;
  badgeType: "GHARSURE" | "TRIAL" | "GENERAL";
  viewAllTab: string;
  onViewAll: () => void;
}

function ProductShelf({
  title,
  subtitle,
  products,
  userCoins,
  onSpecsClick,
  onOrderClick,
  onRedeemClick,
  redeemingId,
  badgeType,
  onViewAll,
}: ProductShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Shelf Header with Desktop Scroll Arrows */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-brand-purple hover:underline hidden sm:inline cursor-pointer"
          >
            View All ({products.length})
          </button>

          {/* Desktop Left / Right Scroll Buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable Carousel Shelf */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth scrollbar-none snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[280px] sm:w-[300px] shrink-0 snap-start flex"
          >
            <ProductCard
              product={product}
              userCoins={userCoins}
              onSpecsClick={onSpecsClick}
              onOrderClick={onOrderClick}
              onRedeemClick={onRedeemClick}
              isRedeeming={redeemingId === product.id}
              inShelf
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Consistent Multi-Column Product Card
// -----------------------------------------------------------------------------
interface ProductCardProps {
  product: ProductItem;
  userCoins: number;
  onSpecsClick: (p: ProductItem) => void;
  onOrderClick: (p: ProductItem) => void;
  onRedeemClick: (p: ProductItem) => void;
  isRedeeming?: boolean;
  inShelf?: boolean;
}

function ProductCard({
  product,
  userCoins,
  onSpecsClick,
  onOrderClick,
  onRedeemClick,
  isRedeeming,
  inShelf,
}: ProductCardProps) {
  const isTrial = product.product_type === "TRIAL";
  const cost = product.coin_price ?? 0;
  const price = Number(product.price_inr) || 0;
  const canAfford = userCoins >= cost;
  const score = product.score ? Number(product.score).toFixed(1) : null;

  // Visual header icon based on category
  const renderVisualIcon = () => {
    const cat = product.category?.toLowerCase() || "";
    if (cat.includes("diagnostic") || cat.includes("hardness") || cat.includes("tds")) {
      return <Droplets className="w-8 h-8 text-blue-500" />;
    }
    if (cat.includes("iot") || cat.includes("monitor")) {
      return <Cpu className="w-8 h-8 text-indigo-500" />;
    }
    if (cat.includes("trial")) {
      return <Gift className="w-8 h-8 text-amber-500" />;
    }
    if (cat.includes("spare") || cat.includes("filter") || cat.includes("pump")) {
      return <Wrench className="w-8 h-8 text-slate-500" />;
    }
    return <Sparkles className="w-8 h-8 text-brand-purple" />;
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border transition-all flex flex-col justify-between shadow-2xs group overflow-hidden w-full",
        isTrial
          ? "border-amber-200/90 hover:border-amber-300 hover:shadow-xs"
          : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
      )}
    >
      <div>
        {/* Top Visual Area (Smytten Product Image Container) */}
        <div
          className={cn(
            "h-32 sm:h-36 w-full flex items-center justify-center relative p-3 border-b transition-colors",
            isTrial
              ? "bg-gradient-to-br from-amber-50/60 to-orange-50/40 border-amber-100"
              : "bg-gradient-to-br from-slate-50 to-purple-50/30 border-slate-100"
          )}
        >
          <div className="transform transition-transform group-hover:scale-110">
            {renderVisualIcon()}
          </div>

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs",
                isTrial
                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                  : "bg-white text-slate-700 border border-slate-200"
              )}
            >
              {product.category || "Hardware"}
            </span>

            {score && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{score}</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {product.brand}
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-brand-purple transition-colors">
            {product.title}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.summary}
          </p>
        </div>
      </div>

      {/* Card Footer: Price & Primary Actions */}
      <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
        <div>
          {isTrial ? (
            <div>
              <span className="text-[10px] text-amber-800 font-semibold uppercase block leading-none">
                {cost === 0 ? "Free Trial" : "Coin Cost"}
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-amber-900 leading-tight">
                {cost === 0 ? "0 Coins" : `${cost} Coins`}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] text-slate-400 font-semibold uppercase block leading-none">
                Price
              </span>
              <span className="text-sm sm:text-base font-bold font-mono text-slate-900 leading-tight">
                ₹{price.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSpecsClick(product)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Specs
          </button>

          {isTrial ? (
            <button
              onClick={() => onRedeemClick(product)}
              disabled={isRedeeming || !canAfford}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer",
                canAfford
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {isRedeeming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Gift className="w-3.5 h-3.5" />
              )}
              <span>{cost === 0 ? "Claim Free" : `Redeem (${cost})`}</span>
            </button>
          ) : (
            <button
              onClick={() => onOrderClick(product)}
              className="px-3.5 py-1.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs transition-all flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Order</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Partner Voucher & Offer Card
// -----------------------------------------------------------------------------
interface VoucherCardProps {
  voucher: VoucherItem;
  isCopied: boolean;
  onCopy: (code: string) => void;
}

function VoucherCard({ voucher, isCopied, onCopy }: VoucherCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200 hover:border-indigo-300 transition-all flex flex-col justify-between shadow-2xs group relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
            {voucher.category}
          </span>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {voucher.discount}
          </span>
        </div>

        <span className="text-[11px] font-semibold text-slate-400 uppercase">
          {voucher.partner}
        </span>
        <h3 className="text-sm font-bold text-slate-900 mt-0.5 mb-1 leading-snug group-hover:text-indigo-600 transition-colors">
          {voucher.title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">
          {voucher.terms}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400 font-medium">
          {voucher.validity}
        </div>

        <button
          onClick={() => onCopy(voucher.code)}
          className={cn(
            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer",
            isCopied
              ? "bg-emerald-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          )}
        >
          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="font-mono">{isCopied ? "Copied" : voucher.code}</span>
        </button>
      </div>
    </div>
  );
}
