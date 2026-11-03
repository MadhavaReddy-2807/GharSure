"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, ProductVariant } from "@/context/cart-context";
import { useOverlayControl } from "@/lib/use-overlay";
import {
  Search,
  CheckCircle2,
  X,
  ShoppingBag,
  Coins,
  ChevronLeft,
  ChevronRight,
  Heart,
  Star,
  Check,
  Copy,
  Ticket,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Info,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoucherRecord } from "@/lib/voucher-db";

export interface ProductItem {
  id: string;
  title: string;
  summary: string;
  price_inr: string | number;
  coin_price?: number;
  brand: string;
  category: string;
  product_type?: "GHARSURE_PRODUCT" | "TRIAL" | "GENERAL_PRODUCT" | string;
  image_url?: string;
  tag?: string;
  size_label?: string;
  inventory_stock?: number;
  is_featured?: boolean;
  is_hot_pick?: boolean;
  is_recommended?: boolean;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  discount_percent?: number;
  score: number | null;
  specifications?: Record<string, any>;
  variants?: ProductVariant[];
}

interface StoreClientViewProps {
  initialProducts: ProductItem[];
  initialVouchers: VoucherRecord[];
  userCoins: number;
  isLoggedIn: boolean;
}

type StoreCategory = "ALL" | "PRODUCTS" | "TRAIL_KITS" | "VOUCHERS";

export function StoreClientView({
  initialProducts,
  initialVouchers,
  userCoins: initialCoins,
  isLoggedIn,
}: StoreClientViewProps) {
  const router = useRouter();
  const [products] = useState<ProductItem[]>(initialProducts);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>(initialVouchers);
  const [userCoins, setUserCoins] = useState<number>(initialCoins);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<StoreCategory>("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [productQuantity, setProductQuantity] = useState(1);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [unlockingVoucherId, setUnlockingVoucherId] = useState<string | null>(null);

  // Hook to handle Escape key and body scroll lock for the product drawer
  useOverlayControl(Boolean(selectedProduct), () => setSelectedProduct(null));

  const { addToCart, openCart } = useCart();

  const openProductDrawer = (product: ProductItem) => {
    setSelectedProduct(product);
    setSelectedVariant(product.variants?.[0]);
    setProductQuantity(1);
  };

  // Categorize products
  const trailKitProducts = useMemo(
    () => products.filter((p) => p.product_type === "TRIAL"),
    [products]
  );
  const standardProducts = useMemo(
    () => products.filter((p) => p.product_type !== "TRIAL"),
    [products]
  );

  // Admin-controlled curated merchandising collections
  const hotPicks = useMemo(
    () => products.filter((p) => Boolean(p.is_hot_pick)),
    [products]
  );
  const recommendedProducts = useMemo(
    () => products.filter((p) => Boolean(p.is_recommended)),
    [products]
  );
  const featuredProducts = useMemo(
    () => products.filter((p) => Boolean(p.is_featured)),
    [products]
  );
  const newArrivals = useMemo(
    () => products.filter((p) => Boolean(p.is_new_arrival)),
    [products]
  );
  const popularProducts = useMemo(
    () => standardProducts.slice(0, 4),
    [standardProducts]
  );
  const homeEssentials = useMemo(
    () => standardProducts.slice(4),
    [standardProducts]
  );

  // Filter based on search query
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

  const filteredTrails = useMemo(() => trailKitProducts.filter(matchesSearch), [trailKitProducts, searchQuery]);
  const filteredProducts = useMemo(() => standardProducts.filter(matchesSearch), [standardProducts, searchQuery]);

  // Wishlist handler
  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Trail+ / Product Quick Buy -> Option 1: Direct to Buy
  const handleProceedToBuy = (product: ProductItem, variant?: ProductVariant, quantity = 1) => {
    addToCart(product, variant, quantity);
    setSelectedProduct(null);
    router.push("/checkout");
  };

  // Trail+ / Product Add to Cart -> Option 2: Add to Cart with feedback
  const handleAddToCart = (product: ProductItem, variant?: ProductVariant, quantity = 1) => {
    addToCart(product, variant, quantity);
    setFeedback({
      message: `Added ${quantity > 1 ? `${quantity}x ` : ""}"${product.title}" to your cart.`,
      type: "success",
    });
  };

  // Voucher unlock using coins
  const handleUnlockVoucher = async (voucher: VoucherRecord) => {
    if (!isLoggedIn) {
      router.push(`/auth?from=${encodeURIComponent("/store")}`);
      return;
    }

    if (userCoins < voucher.coinCost) {
      setFeedback({
        message: `Insufficient coins. You need ${voucher.coinCost} coins to unlock "${voucher.title}" (Current balance: ${userCoins} coins). Complete surveys to earn more coins!`,
        type: "error",
      });
      return;
    }

    setUnlockingVoucherId(voucher.id);
    try {
      const res = await fetch("/api/vouchers/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: voucher.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to unlock voucher");
      }

      setUserCoins(data.newBalance ?? (userCoins - voucher.coinCost));
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === voucher.id ? { ...v, isUnlocked: true, expiresAt: data.voucher?.expiresAt } : v
        )
      );

      setFeedback({
        message: `Unlocked "${voucher.title}"! Apply code "${voucher.code}" at checkout to redeem discount.`,
        type: "success",
      });
    } catch (err: any) {
      setFeedback({
        message: err.message || "Could not unlock voucher.",
        type: "error",
      });
    } finally {
      setUnlockingVoucherId(null);
    }
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setTimeout(() => setCopiedVoucher(null), 2500);
  };

  return (
    <div className="space-y-10 w-full max-w-7xl mx-auto pb-16">
      {/* 1. STORE HEADER & CATEGORY NAVIGATION */}
      <div className="space-y-4 pb-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              GharSure Store
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Household care essentials, doorstep trial kits, and partner service vouchers
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input in Store */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands..."
                className="w-full h-9 pl-10 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Coins Indicator */}
            <Link
              href="/rewards"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-xs shrink-0 transition-colors"
              title="Your Available GharSure Coins"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono font-bold">{userCoins.toLocaleString()}</span>
              <span className="text-[11px] text-amber-700 hidden sm:inline font-medium">Coins</span>
            </Link>
          </div>
        </div>

        {/* 3 Categories: Products, Trail Kits, Vouchers */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pt-1">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
              activeCategory === "ALL"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
            )}
          >
            All Discover
          </button>

          <button
            onClick={() => setActiveCategory("PRODUCTS")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
              activeCategory === "PRODUCTS"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "border border-slate-200 hover:bg-slate-50 text-slate-700"
            )}
          >
            Products ({standardProducts.length})
          </button>

          <button
            onClick={() => setActiveCategory("TRAIL_KITS")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5",
              activeCategory === "TRAIL_KITS"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "border border-slate-200 hover:bg-slate-50 text-slate-700"
            )}
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Trail Kits ({trailKitProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveCategory("VOUCHERS")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5",
              activeCategory === "VOUCHERS"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "border border-slate-200 hover:bg-slate-50 text-slate-700"
            )}
          >
            <Ticket className="w-3.5 h-3.5 text-indigo-500" />
            <span>Vouchers ({vouchers.length})</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-lg border text-xs flex items-center justify-between animate-fade-in shadow-xs",
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Coins className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {feedback.type === "success" && (
              <button
                onClick={openCart}
                className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                View Cart →
              </button>
            )}
            {feedback.type === "error" && (
              <Link
                href="/rewards"
                className="text-xs font-bold text-amber-800 underline hover:text-amber-950"
              >
                Earn Coins →
              </Link>
            )}
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. SHOPIFY-STYLE CLEAN SECTIONS (Zero Explanatory Cards, Image-Led) */}
      {activeCategory === "ALL" && !searchQuery && (
        <div className="space-y-12">
          {/* SECTION 0A: Hot Picks (Admin Merchandising) */}
          {hotPicks.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Trending Hot Picks
                  </h2>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Hot Pick
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {hotPicks.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isTrial={p.product_type === "TRIAL"}
                    onAddToCart={() => handleAddToCart(p)}
                    onCardClick={() => openProductDrawer(p)}
                    isWishlisted={Boolean(wishlist[p.id])}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 0B: Recommended for You (Admin Merchandising) */}
          {recommendedProducts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Recommended For You
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {recommendedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isTrial={p.product_type === "TRIAL"}
                    onAddToCart={() => handleAddToCart(p)}
                    onCardClick={() => openProductDrawer(p)}
                    isWishlisted={Boolean(wishlist[p.id])}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 1: Featured Products */}
          {featuredProducts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Featured Products
                </h2>
                <button
                  onClick={() => setActiveCategory("PRODUCTS")}
                  className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  View All ({standardProducts.length})
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {featuredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isTrial={p.product_type === "TRIAL"}
                    onAddToCart={() => handleAddToCart(p)}
                    onCardClick={() => openProductDrawer(p)}
                    isWishlisted={Boolean(wishlist[p.id])}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 2: Popular Products */}
          {popularProducts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Popular Products
                </h2>
                <button
                  onClick={() => setActiveCategory("PRODUCTS")}
                  className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {popularProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isTrial={false}
                    onAddToCart={() => handleAddToCart(p)}
                    onCardClick={() => openProductDrawer(p)}
                    isWishlisted={Boolean(wishlist[p.id])}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 3: Trail Kits */}
          {filteredTrails.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Trail Kits
                  </h2>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Redeem with Coins
                  </span>
                </div>
                <button
                  onClick={() => setActiveCategory("TRAIL_KITS")}
                  className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                >
                  View All ({filteredTrails.length})
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {filteredTrails.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isTrial={true}
                    onAddToCart={() => handleAddToCart(p)}
                    onCardClick={() => openProductDrawer(p)}
                    isWishlisted={Boolean(wishlist[p.id])}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 4: Home Essentials */}
          {homeEssentials.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Home Essentials
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                {homeEssentials.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isTrial={false}
                    onAddToCart={() => handleAddToCart(p)}
                    onCardClick={() => openProductDrawer(p)}
                    isWishlisted={Boolean(wishlist[p.id])}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION 5: Vouchers */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Vouchers
              </h2>
              <button
                onClick={() => setActiveCategory("VOUCHERS")}
                className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                View All ({vouchers.length})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vouchers.map((v) => (
                <VoucherCard
                  key={v.id}
                  voucher={v}
                  userCoins={userCoins}
                  isUnlocking={unlockingVoucherId === v.id}
                  isCopied={copiedVoucher === v.code}
                  onCopy={handleCopyVoucher}
                  onUnlock={() => handleUnlockVoucher(v)}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* 3. PRODUCTS TAB VIEW */}
      {(activeCategory === "PRODUCTS" || (activeCategory === "ALL" && searchQuery)) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Products ({filteredProducts.length})
            </h2>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500">
              No products found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isTrial={false}
                  onAddToCart={() => handleAddToCart(p)}
                  onCardClick={() => openProductDrawer(p)}
                  isWishlisted={Boolean(wishlist[p.id])}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. TRAIL KITS TAB VIEW */}
      {(activeCategory === "TRAIL_KITS" || (activeCategory === "ALL" && searchQuery)) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Trail Kits ({filteredTrails.length})
              </h2>
              <span className="text-xs font-semibold font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Redeem with Coins
              </span>
            </div>
          </div>

          {filteredTrails.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500">
              No trail kits found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {filteredTrails.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isTrial={true}
                  onAddToCart={() => handleAddToCart(p)}
                  onCardClick={() => openProductDrawer(p)}
                  isWishlisted={Boolean(wishlist[p.id])}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 5. VOUCHERS TAB VIEW */}
      {activeCategory === "VOUCHERS" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Available Vouchers ({vouchers.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vouchers.map((v) => (
              <VoucherCard
                key={v.id}
                voucher={v}
                userCoins={userCoins}
                isUnlocking={unlockingVoucherId === v.id}
                isCopied={copiedVoucher === v.code}
                onCopy={handleCopyVoucher}
                onUnlock={() => handleUnlockVoucher(v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. TRAIL+ & PRODUCT DETAIL SIDEBAR DRAWER (Wide two-column on desktop, responsive full-height bottom-sheet on mobile) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in cursor-pointer"
            onClick={() => setSelectedProduct(null)}
            aria-label="Close product sidebar overlay"
          />

          {/* Left-Aligned Drawer Container */}
          <div className="fixed inset-y-0 left-0 max-w-full flex pr-0 sm:pr-8 md:pr-12 pointer-events-none z-10">
            <div className="w-screen max-w-full md:max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-white shadow-2xl flex flex-col animate-slide-in-left border-r border-slate-200 pointer-events-auto h-full max-h-screen overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded uppercase tracking-wider border border-blue-100 shrink-0">
                    {selectedProduct.brand || "GharSure"}
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-xs font-semibold text-slate-600 truncate">
                    {selectedProduct.product_type === "TRIAL" ? "Doorstep Trial+" : selectedProduct.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline text-[10px] font-mono text-slate-400 uppercase font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                    ESC
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close product drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body (Desktop: Two Balanced Columns, Mobile: Natural Vertical Flow) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 overscroll-contain">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
                  {/* Left Column: Product Imagery & Assurance */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 relative group flex items-center justify-center p-4">
                      <img
                        src={selectedProduct.image_url || "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80"}
                        alt={selectedProduct.title}
                        loading="eager"
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      {selectedProduct.product_type === "TRIAL" && (
                        <div className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Trail+ Sample</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => toggleWishlist(selectedProduct.id, e)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-rose-600 transition-colors shadow-xs cursor-pointer border border-slate-200"
                        aria-label="Save to wishlist"
                      >
                        <Heart
                          className={cn("w-4 h-4", wishlist[selectedProduct.id] && "fill-rose-600 text-rose-600")}
                        />
                      </button>
                    </div>

                    {/* Resident Assurance Perks */}
                    <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70 space-y-2.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-800">100% Verified Household Quality</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800">Direct Society Resident Delivery</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Title, Pricing, Variant & Specs */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                      {/* Brand & Title */}
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-[#2563EB] uppercase text-xs tracking-wider">
                            {selectedProduct.brand}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500 font-medium text-xs">{selectedProduct.category}</span>
                          {selectedProduct.score && (
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{Number(selectedProduct.score).toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                          {selectedProduct.title}
                        </h2>
                      </div>

                      {/* Pricing & Stock Card */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Price
                          </span>
                          {selectedProduct.product_type === "TRIAL" ? (
                            <div className="text-lg font-bold font-mono text-amber-900 flex items-center gap-1.5">
                              <Coins className="w-5 h-5 text-amber-600" />
                              <span>
                                {selectedProduct.coin_price === 0
                                  ? "Free Trial (0 Coins)"
                                  : `${selectedProduct.coin_price} Coins`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold font-mono text-slate-900">
                                ₹{Number(selectedVariant?.price_inr ?? selectedProduct.price_inr ?? 0).toLocaleString("en-IN")}
                              </span>
                              {selectedProduct.discount_percent && selectedProduct.discount_percent > 0 && (
                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {selectedProduct.discount_percent}% OFF
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Status
                          </span>
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 justify-end">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>In Stock</span>
                          </span>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {selectedProduct.summary}
                      </p>

                      {/* Variant Selector */}
                      {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">Select Edition / Size:</span>
                            {selectedVariant && (
                              <span className="text-[#2563EB] font-semibold">{selectedVariant.name}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.variants.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => setSelectedVariant(v)}
                                className={cn(
                                  "px-3.5 py-2 rounded-xl border text-xs transition-all cursor-pointer font-medium",
                                  selectedVariant?.id === v.id
                                    ? "border-[#2563EB] bg-blue-50 text-[#2563EB] shadow-xs font-bold ring-1 ring-blue-500/20"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                )}
                              >
                                {v.name}
                                {v.price_inr && Number(v.price_inr) !== Number(selectedProduct.price_inr) && (
                                  <span className="ml-1.5 text-[10px] opacity-75">
                                    (₹{Number(v.price_inr).toLocaleString()})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quantity Selector */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-800 block">Quantity:</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setProductQuantity((q) => Math.max(1, q - 1))}
                              disabled={productQuantity <= 1}
                              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200/80 disabled:opacity-30 transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-9 text-center font-mono font-bold text-xs text-slate-900">
                              {productQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setProductQuantity((q) => q + 1)}
                              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {productQuantity > 1 && (
                            <span className="text-xs text-slate-500 font-mono">
                              Total: ₹{(Number(selectedVariant?.price_inr ?? selectedProduct.price_inr ?? 0) * productQuantity).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Authoritative Database Specifications */}
                      {(() => {
                        let parsedSpecs: Record<string, any> = {};
                        if (typeof selectedProduct.specifications === "string") {
                          try {
                            parsedSpecs = JSON.parse(selectedProduct.specifications);
                          } catch {
                            parsedSpecs = {};
                          }
                        } else if (
                          selectedProduct.specifications &&
                          typeof selectedProduct.specifications === "object" &&
                          !Array.isArray(selectedProduct.specifications)
                        ) {
                          parsedSpecs = selectedProduct.specifications;
                        }

                        const validEntries = Object.entries(parsedSpecs).filter(
                          ([k, v]) =>
                            !/^\d+$/.test(k) &&
                            typeof v !== "object" &&
                            v !== null &&
                            v !== undefined &&
                            String(v).trim() !== ""
                        );

                        return (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                              Specifications & Details
                            </span>
                            {validEntries.length > 0 ? (
                              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs bg-white shadow-2xs">
                                {validEntries.map(([k, v]) => (
                                  <div key={k} className="p-2.5 px-3.5 flex items-center justify-between hover:bg-slate-50/50">
                                    <span className="text-slate-500 font-medium capitalize">
                                      {k.replace(/([A-Z])/g, " $1")}
                                    </span>
                                    <span className="text-slate-900 font-semibold text-right">{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 leading-relaxed">
                                Standard manufacturer specifications verified for residential deployment by GharSure.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Actions Bar */}
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-white/95 backdrop-blur-xs shrink-0 flex items-center justify-between gap-4">
                <div className="hidden sm:block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Payable
                  </span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {selectedProduct.product_type === "TRIAL"
                      ? selectedProduct.coin_price === 0
                        ? "Free Trial"
                        : `${(selectedProduct.coin_price || 0) * productQuantity} Coins`
                      : `₹${(Number(selectedVariant?.price_inr ?? selectedProduct.price_inr ?? 0) * productQuantity).toLocaleString("en-IN")}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:flex sm:items-center sm:gap-3 flex-1 sm:flex-initial sm:justify-end">
                  {/* Option 2: Add to Cart */}
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(selectedProduct, selectedVariant, productQuantity);
                      setSelectedProduct(null);
                    }}
                    className="py-3 px-5 rounded-xl border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>

                  {/* Option 1: Buy Now / Proceed to Buy */}
                  <button
                    type="button"
                    onClick={() => handleProceedToBuy(selectedProduct, selectedVariant, productQuantity)}
                    className="py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
                  >
                    <span>Buy Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
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
// Image-Led Product Card (Shopify Style)
// -----------------------------------------------------------------------------
interface ProductCardProps {
  product: ProductItem;
  isTrial: boolean;
  onAddToCart: () => void;
  onCardClick: () => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
}

function ProductCard({
  product,
  isTrial,
  onAddToCart,
  onCardClick,
  isWishlisted,
  onToggleWishlist,
}: ProductCardProps) {
  const cost = product.coin_price ?? 0;
  const price = Number(product.price_inr) || 0;
  const score = product.score ? Number(product.score).toFixed(1) : null;
  const tag = product.tag || (isTrial ? "Trial+" : product.is_hot_pick ? "Hot Pick" : null);

  return (
    <div
      onClick={onCardClick}
      className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden w-full cursor-pointer group"
    >
      <div>
        {/* Aspect-Square Image Box */}
        <div className="relative aspect-square w-full bg-slate-50 overflow-hidden flex items-center justify-center p-2.5">
          <img
            src={product.image_url || "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80"}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />

          {/* Minimal Tag Badge */}
          {tag && (
            <div className="absolute top-2.5 left-2.5 z-10">
              <span
                className={cn(
                  "inline-flex items-center text-[9px] font-bold text-white px-2 py-0.5 rounded-full shadow-2xs uppercase tracking-tight",
                  isTrial ? "bg-amber-600" : "bg-slate-900"
                )}
              >
                {tag}
              </span>
            </div>
          )}

          {/* Heart Wishlist Icon */}
          <button
            type="button"
            onClick={(e) => onToggleWishlist(product.id, e)}
            className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-600 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer border border-slate-100"
            aria-label="Save to wishlist"
          >
            <Heart
              className={cn("w-3.5 h-3.5", isWishlisted && "fill-rose-600 text-rose-600")}
            />
          </button>

          {/* Rating Badge */}
          {score && (
            <div className="absolute bottom-2.5 left-2.5 z-10">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs border border-slate-200/60">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{score}</span>
              </span>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="p-3 sm:p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
            {product.brand}
          </div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#2563EB] transition-colors">
            {product.title}
          </h4>
        </div>
      </div>

      {/* Footer: Price & Add to Cart Action */}
      <div className="p-3 sm:p-3.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <div>
          {isTrial ? (
            <div className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-bold font-mono text-amber-900 leading-none">
                {cost === 0 ? "Free" : `${cost} C`}
              </span>
            </div>
          ) : (
            <div>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 leading-tight">
                ₹{price.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart();
          }}
          className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>{isTrial ? "Try +" : "Add +"}</span>
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Partner Voucher Card (Unlock with Coins or Copy)
// -----------------------------------------------------------------------------
interface VoucherCardProps {
  voucher: VoucherRecord;
  userCoins: number;
  isUnlocking: boolean;
  isCopied: boolean;
  onCopy: (code: string) => void;
  onUnlock: () => void;
}

function VoucherCard({
  voucher,
  userCoins,
  isUnlocking,
  isCopied,
  onCopy,
  onUnlock,
}: VoucherCardProps) {
  const isUnlocked = voucher.isUnlocked;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between text-xs space-y-3 shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-slate-400 uppercase text-[10px]">{voucher.partner}</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
            {voucher.discountType === "PERCENTAGE"
              ? `${voucher.discountValue}% OFF`
              : voucher.discountType === "FREE_PASS"
              ? "FREE PASS"
              : `₹${voucher.discountValue} FLAT`}
          </span>
        </div>
        <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">{voucher.title}</h3>
        <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">{voucher.description}</p>
      </div>

      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-400">
          {isUnlocked ? (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Unlocked</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-amber-800">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>{voucher.coinCost} Coins to unlock</span>
            </span>
          )}
        </div>

        {isUnlocked ? (
          <button
            onClick={() => onCopy(voucher.code)}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs",
              isCopied
                ? "bg-emerald-600 text-white"
                : "bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            )}
          >
            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? "Copied" : voucher.code}</span>
          </button>
        ) : (
          <button
            onClick={onUnlock}
            disabled={isUnlocking}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{isUnlocking ? "Unlocking..." : `Unlock (${voucher.coinCost} C)`}</span>
          </button>
        )}
      </div>
    </div>
  );
}
