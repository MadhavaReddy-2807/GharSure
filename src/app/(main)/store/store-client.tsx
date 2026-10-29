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

// Category filter tabs
const categories = [
  { id: "ALL", label: "All Products" },
  { id: "Lab Diagnostics", label: "Diagnostics" },
  { id: "IoT Monitors", label: "IoT Monitors" },
  { id: "Trial Kits", label: "Doorstep Trials" },
  { id: "Water Purifiers", label: "Purifiers" },
  { id: "Spares", label: "Filters & Spares" },
  { id: "Water Conditioners", label: "Conditioners" },
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
    if (selectedCategory !== "ALL") {
      const matchCat = p.category?.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;
    }
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
    setFeedback(`Order confirmed for "${product.title}". Delivery scheduled.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRedeemTrial = async (trial: ProductItem) => {
    if (!isLoggedIn) {
      window.location.href = "/auth";
      return;
    }

    const cost = trial.coin_price ?? 0;
    if (userCoins < cost) {
      setFeedback(`Insufficient coins (${userCoins} / ${cost} needed). Complete surveys to earn coins.`);
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
      setFeedback(`Doorstep trial kit confirmed! "${trial.title}" will be delivered to your address.`);
      setTimeout(() => setFeedback(null), 3500);

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

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setFeedback(`Voucher code "${code}" copied.`);
    setTimeout(() => {
      setCopiedVoucher(null);
      setFeedback(null);
    }, 2500);
  };

  return (
    <div className="w-full space-y-8 pb-16 select-none">
      {/* 1. STOREFRONT HEADER & SEARCH (HexaHome / Home4U Style) */}
      <div className="space-y-4 pb-4 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Store & Doorstep Trials
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Certified water diagnostics, doorstep trial kits, and genuine replacement spares.
            </p>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, spares..."
                className="w-full h-9 pl-8.5 pr-8 rounded-md border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Link
              href="/rewards"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-900 text-xs shrink-0 transition-colors"
              title="Your Available Coins"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono font-bold">{userCoins.toLocaleString()}</span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">Coins</span>
            </Link>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActiveTab("ALL");
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors cursor-pointer",
                  isSelected
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium"
                )}
              >
                {cat.label}
              </button>
            );
          })}

          <button
            onClick={() => setActiveTab("VOUCHERS")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors cursor-pointer ml-auto",
              activeTab === "VOUCHERS"
                ? "bg-slate-900 text-white font-semibold"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            )}
          >
            Vouchers ({vouchers.length})
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. PROMOTIONAL SPOTLIGHT (Restrained, Home4U/Smytten style) */}
      {activeTab === "ALL" && !searchQuery && selectedCategory === "ALL" && (
        <div className="p-5 sm:p-6 rounded-lg border border-slate-200 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Zero-Cost Research Trials
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Redeem GharSure Coins for Water Testing Kits
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Exchange your earned survey coins for verified rapid TDS test strips, food-grade citric descaler pouches, and mineral inline filters.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedCategory("Trial Kits");
              setActiveTab("ALL");
            }}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shrink-0 self-start md:self-center cursor-pointer"
          >
            Browse Trials
          </button>
        </div>
      )}

      {/* 3. DISCOVER SHELVES (When browsing ALL without specific query) */}
      {activeTab === "ALL" && selectedCategory === "ALL" && !searchQuery && (
        <div className="space-y-10">
          {/* SHELF 1: GHARSURE PRODUCTS */}
          {filteredGharsure.length > 0 && (
            <ProductShelf
              title="Featured GharSure Diagnostics & IoT"
              products={filteredGharsure}
              userCoins={userCoins}
              onSpecsClick={setSelectedProduct}
              onOrderClick={handleAddToCart}
              onRedeemClick={handleRedeemTrial}
              redeemingId={redeemingId}
              onViewAll={() => setActiveTab("GHARSURE_PRODUCT")}
            />
          )}

          {/* SHELF 2: DOORSTEP TRIALS (COINS) */}
          {filteredTrials.length > 0 && (
            <ProductShelf
              title="Doorstep Trials (Redeem with Coins)"
              products={filteredTrials}
              userCoins={userCoins}
              onSpecsClick={setSelectedProduct}
              onOrderClick={handleAddToCart}
              onRedeemClick={handleRedeemTrial}
              redeemingId={redeemingId}
              onViewAll={() => setActiveTab("TRIAL")}
            />
          )}

          {/* SHELF 3: GENERAL PRODUCTS & SPARES */}
          {filteredGeneral.length > 0 && (
            <ProductShelf
              title="Water Purifiers & Replacement Spares"
              products={filteredGeneral}
              userCoins={userCoins}
              onSpecsClick={setSelectedProduct}
              onOrderClick={handleAddToCart}
              onRedeemClick={handleRedeemTrial}
              redeemingId={redeemingId}
              onViewAll={() => setActiveTab("GENERAL_PRODUCT")}
            />
          )}

          {/* SHELF 4: PARTNER VOUCHERS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Exclusive Service Vouchers ({vouchers.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
        </div>
      )}

      {/* 4. FILTERED / TAB-SPECIFIC CATALOG GRID */}
      {(activeTab !== "ALL" || selectedCategory !== "ALL" || searchQuery) && activeTab !== "VOUCHERS" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Catalog Items ({allFiltered.length})
            </h2>
            {(selectedCategory !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                  setActiveTab("ALL");
                }}
                className="text-xs font-semibold text-brand-purple hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          {allFiltered.length === 0 ? (
            <div className="p-12 text-center rounded-lg border border-slate-200 bg-white">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-slate-800">No Products Found</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                No catalog items match your search &ldquo;{searchQuery}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allFiltered.map((p) => (
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
          )}
        </section>
      )}

      {/* 5. VOUCHERS TAB */}
      {activeTab === "VOUCHERS" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Partner Vouchers & Offers ({vouchers.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

      {/* 6. PRODUCT SPECIFICATIONS MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-xl p-5 border border-slate-200 animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Product Details
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase">
                  {selectedProduct.brand} · {selectedProduct.category}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedProduct.title}
                </h3>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  {selectedProduct.summary}
                </p>
              </div>

              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div className="border border-slate-200 rounded divide-y divide-slate-100 overflow-hidden">
                  {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                    <div key={k} className="p-2.5 flex items-center justify-between">
                      <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="text-slate-900 font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {selectedProduct.product_type === "TRIAL" ? (
                    <span className="text-sm font-bold font-mono text-amber-900">
                      {selectedProduct.coin_price === 0 ? "0 Coins (Free)" : `${selectedProduct.coin_price} Coins`}
                    </span>
                  ) : (
                    <span className="text-sm font-bold font-mono text-slate-900">
                      ₹{Number(selectedProduct.price_inr || 0).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
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
                        "px-4 py-1.5 rounded text-xs font-semibold cursor-pointer",
                        userCoins >= (selectedProduct.coin_price ?? 0)
                          ? "bg-slate-900 hover:bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      {selectedProduct.coin_price === 0 ? "Claim Free" : `Redeem (${selectedProduct.coin_price})`}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleAddToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                    >
                      Order
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
// Horizontal Product Shelf
// -----------------------------------------------------------------------------
interface ProductShelfProps {
  title: string;
  products: ProductItem[];
  userCoins: number;
  onSpecsClick: (p: ProductItem) => void;
  onOrderClick: (p: ProductItem) => void;
  onRedeemClick: (p: ProductItem) => void;
  redeemingId: string | null;
  onViewAll: () => void;
}

function ProductShelf({
  title,
  products,
  userCoins,
  onSpecsClick,
  onOrderClick,
  onRedeemClick,
  redeemingId,
  onViewAll,
}: ProductShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          {title}
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-brand-purple hover:underline cursor-pointer"
          >
            View All ({products.length})
          </button>

          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              className="w-7 h-7 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-7 h-7 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex items-stretch gap-3.5 overflow-x-auto pb-2 scroll-smooth scrollbar-none snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[260px] sm:w-[280px] shrink-0 snap-start flex"
          >
            <ProductCard
              product={product}
              userCoins={userCoins}
              onSpecsClick={onSpecsClick}
              onOrderClick={onOrderClick}
              onRedeemClick={onRedeemClick}
              isRedeeming={redeemingId === product.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Product Card (Home4U/Smytten Minimalist Commerce Card)
// -----------------------------------------------------------------------------
interface ProductCardProps {
  product: ProductItem;
  userCoins: number;
  onSpecsClick: (p: ProductItem) => void;
  onOrderClick: (p: ProductItem) => void;
  onRedeemClick: (p: ProductItem) => void;
  isRedeeming?: boolean;
}

function ProductCard({
  product,
  userCoins,
  onSpecsClick,
  onOrderClick,
  onRedeemClick,
  isRedeeming,
}: ProductCardProps) {
  const isTrial = product.product_type === "TRIAL";
  const cost = product.coin_price ?? 0;
  const price = Number(product.price_inr) || 0;
  const canAfford = userCoins >= cost;

  return (
    <div className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between overflow-hidden w-full p-4">
      <div>
        {/* Neutral Image Box */}
        <div className="h-32 rounded bg-slate-50 border border-slate-100 flex items-center justify-center relative mb-3">
          <Package className="w-8 h-8 text-slate-300" />

          {/* Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-[10px]">
            <span className="font-semibold uppercase text-slate-500">
              {product.category}
            </span>
            {isTrial && (
              <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                Trial
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          {product.brand}
        </div>
        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
          {product.title}
        </h3>
      </div>

      {/* Pricing & Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          {isTrial ? (
            <span className="text-xs sm:text-sm font-bold font-mono text-amber-900">
              {cost === 0 ? "0 Coins" : `${cost} Coins`}
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
              ₹{price.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onSpecsClick(product)}
            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded cursor-pointer"
          >
            Specs
          </button>

          {isTrial ? (
            <button
              onClick={() => onRedeemClick(product)}
              disabled={isRedeeming || !canAfford}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-semibold cursor-pointer",
                canAfford
                  ? "bg-slate-900 hover:bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {isRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : "Claim"}
            </button>
          ) : (
            <button
              onClick={() => onOrderClick(product)}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Voucher Card
// -----------------------------------------------------------------------------
interface VoucherCardProps {
  voucher: VoucherItem;
  isCopied: boolean;
  onCopy: (code: string) => void;
}

function VoucherCard({ voucher, isCopied, onCopy }: VoucherCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between text-xs space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1 text-[11px]">
          <span className="font-semibold text-slate-400 uppercase">{voucher.partner}</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
            {voucher.discount}
          </span>
        </div>
        <h3 className="font-semibold text-slate-900 leading-snug">{voucher.title}</h3>
        <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">{voucher.terms}</p>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{voucher.validity}</span>
        <button
          onClick={() => onCopy(voucher.code)}
          className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 font-mono font-semibold text-slate-800 text-[11px] cursor-pointer flex items-center gap-1"
        >
          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
          <span>{isCopied ? "Copied" : voucher.code}</span>
        </button>
      </div>
    </div>
  );
}
