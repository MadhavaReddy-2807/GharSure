"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useCart } from "@/context/cart-context";
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
  image_url?: string;
  tag?: string;
  size_label?: string;
  inventory_stock?: number;
  is_featured?: boolean;
  score: number | null;
  specifications?: Record<string, any>;
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

// Exactly 3 Store Categories requested by user
type StoreCategory = "ALL" | "PRODUCTS" | "TRAIL_KITS" | "VOUCHERS";

export function StoreClientView({
  initialProducts,
  vouchers,
  userCoins: initialCoins,
  isLoggedIn,
}: StoreClientViewProps) {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [userCoins, setUserCoins] = useState<number>(initialCoins);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<StoreCategory>("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const { addToCart, openCart } = useCart();

  // Categorize products into exactly the 2 product buckets: Trail Kits and Products
  const trailKitProducts = useMemo(
    () => products.filter((p) => p.product_type === "TRIAL"),
    [products]
  );
  const standardProducts = useMemo(
    () => products.filter((p) => p.product_type !== "TRIAL"),
    [products]
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

  const handleAddProduct = (product: ProductItem) => {
    addToCart(product);
    setFeedback(`Added "${product.title}" to cart.`);
    setTimeout(() => setFeedback(null), 2500);
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVoucher(code);
    setFeedback(`Voucher code "${code}" copied to clipboard!`);
    setTimeout(() => {
      setCopiedVoucher(null);
      setFeedback(null);
    }, 2500);
  };

  return (
    <div className="w-full space-y-8 pb-16 select-none">
      {/* 1. STORE HEADER & CATEGORIES (Exactly 3 categories: Products, Trail Kits, Vouchers) */}
      <div className="space-y-4 pb-4 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Store
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Discover household products, doorstep trial kits, and exclusive partner vouchers.
            </p>
          </div>

          {/* Search Box & Coins Pill */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands..."
                className="w-full h-9 pl-8.5 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] transition-colors"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100/80 text-amber-900 text-xs shrink-0 transition-colors"
              title="Your Available GharSure Coins"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono font-bold">{userCoins.toLocaleString()}</span>
              <span className="text-[11px] text-amber-700 hidden sm:inline font-medium">Coins</span>
            </Link>
          </div>
        </div>

        {/* 3 Categories Pills: Products, Trail Kits, Vouchers */}
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
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. ALL DISCOVER VIEW (Smytten Shelf Layout Matching Image 2) */}
      {activeCategory === "ALL" && !searchQuery && (
        <div className="space-y-10">
          {/* SHELF 1: TRAIL KITS (Trending Minis To Grab - Image 2 Style) */}
          {filteredTrails.length > 0 && (
            <SmyttenShelf
              heading="Trending Minis To Grab 📈"
              subheading="Trial Kits"
              bannerBg="bg-[#EAF2FF]"
              products={filteredTrails}
              isTrial
              onAddToCart={handleAddProduct}
              onCardClick={setSelectedProduct}
              isWishlisted={wishlist}
              onToggleWishlist={toggleWishlist}
              onViewAll={() => setActiveCategory("TRAIL_KITS")}
            />
          )}

          {/* SHELF 2: PRODUCTS (Popular Household Products) */}
          {filteredProducts.length > 0 && (
            <SmyttenShelf
              heading="Featured Products 🏠"
              subheading="Home Care"
              bannerBg="bg-[#F5F3FF]"
              products={filteredProducts}
              isTrial={false}
              onAddToCart={handleAddProduct}
              onCardClick={setSelectedProduct}
              isWishlisted={wishlist}
              onToggleWishlist={toggleWishlist}
              onViewAll={() => setActiveCategory("PRODUCTS")}
            />
          )}

          {/* SHELF 3: VOUCHERS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Exclusive Partner Vouchers
                </h2>
                <p className="text-xs text-slate-500">Service discounts and complimentary inspection passes</p>
              </div>
              <button
                onClick={() => setActiveCategory("VOUCHERS")}
                className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                View All ({vouchers.length})
              </button>
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

      {/* 3. PRODUCTS TAB VIEW */}
      {(activeCategory === "PRODUCTS" || (activeCategory === "ALL" && searchQuery)) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Products ({filteredProducts.length})
              </h2>
              <p className="text-xs text-slate-500">Household appliances, filtration, and home care essentials</p>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-10 text-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500">
              No products found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isTrial={false}
                  onAddToCart={handleAddProduct}
                  onCardClick={setSelectedProduct}
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
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Trail Kits ({filteredTrails.length})</span>
                <span className="text-xs font-semibold font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Redeem with Coins
                </span>
              </h2>
              <p className="text-xs text-slate-500">Zero monetary charge. Delivered to your doorstep.</p>
            </div>
          </div>

          {filteredTrails.length === 0 ? (
            <div className="p-10 text-center rounded-lg border border-slate-200 bg-white text-xs text-slate-500">
              No trail kits found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredTrails.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isTrial={true}
                  onAddToCart={handleAddProduct}
                  onCardClick={setSelectedProduct}
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
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Partner Vouchers ({vouchers.length})
              </h2>
              <p className="text-xs text-slate-500">Instant discounts on home services and certified care</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
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

      {/* 6. PRODUCT DETAILS & SPECS MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-5 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Product Details
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product Photo */}
              <div className="w-full h-48 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative">
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#2563EB] uppercase">
                    {selectedProduct.brand}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500 font-medium">{selectedProduct.category}</span>
                  {selectedProduct.score && (
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ★ {Number(selectedProduct.score).toFixed(1)} Rating
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedProduct.title}</h3>
                <p className="text-slate-600 mt-1 leading-relaxed">{selectedProduct.summary}</p>
              </div>

              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                    <div key={k} className="p-2.5 flex items-center justify-between">
                      <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="text-slate-900 font-semibold">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {selectedProduct.product_type === "TRIAL" ? (
                    <div className="text-sm font-bold font-mono text-amber-900 flex items-center gap-1">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>{selectedProduct.coin_price === 0 ? "0 Coins (Free)" : `${selectedProduct.coin_price} Coins`}</span>
                    </div>
                  ) : (
                    <div className="text-base font-bold font-mono text-slate-900">
                      ₹{Number(selectedProduct.price_inr || 0).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    handleAddProduct(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{selectedProduct.product_type === "TRIAL" ? "Try +" : "Add +"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Smytten Horizontal Shelf (Image 2 Architecture: Left Banner Block + Cards)
// -----------------------------------------------------------------------------
interface SmyttenShelfProps {
  heading: string;
  subheading: string;
  bannerBg: string;
  products: ProductItem[];
  isTrial: boolean;
  onAddToCart: (p: ProductItem) => void;
  onCardClick: (p: ProductItem) => void;
  isWishlisted: Record<string, boolean>;
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
  onViewAll: () => void;
}

function SmyttenShelf({
  heading,
  subheading,
  bannerBg,
  products,
  isTrial,
  onAddToCart,
  onCardClick,
  isWishlisted,
  onToggleWishlist,
  onViewAll,
}: SmyttenShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -260 : 260;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex items-stretch gap-3 w-full">
      {/* Left Pastel Highlight Block (Matching Image 2) */}
      <div
        className={cn(
          "w-40 sm:w-48 shrink-0 rounded-xl p-4 sm:p-5 flex flex-col justify-between select-none relative overflow-hidden",
          bannerBg
        )}
      >
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {heading}
          </h3>
          <p className="text-xs text-slate-500 font-medium">{subheading}</p>
        </div>

        <button
          onClick={onViewAll}
          className="text-xs font-bold text-slate-800 hover:text-[#2563EB] flex items-center gap-1 mt-4 transition-colors cursor-pointer"
        >
          <span>VIEW ALL</span>
          <span>&rarr;</span>
        </button>

        {/* Scroll Control Arrows */}
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel of Cards */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-stretch gap-3 overflow-x-auto pb-2 scroll-smooth scrollbar-none snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[185px] sm:w-[200px] shrink-0 snap-start flex"
          >
            <ProductCard
              product={product}
              isTrial={isTrial}
              onAddToCart={onAddToCart}
              onCardClick={onCardClick}
              isWishlisted={Boolean(isWishlisted[product.id])}
              onToggleWishlist={onToggleWishlist}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Product Card (Exact Match to Image 2: Smytten Card Architecture)
// -----------------------------------------------------------------------------
interface ProductCardProps {
  product: ProductItem;
  isTrial: boolean;
  onAddToCart: (p: ProductItem) => void;
  onCardClick: (p: ProductItem) => void;
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
  const score = product.score ? Number(product.score).toFixed(1) : "4.3";
  const tag = product.tag || (isTrial ? "Trending Now" : "Hot Picks");
  const size = product.size_label || (isTrial ? "25 ml" : "1 Unit");

  return (
    <div
      onClick={() => onCardClick(product)}
      className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden w-full cursor-pointer group shadow-2xs"
    >
      <div>
        {/* Square Image Box with Badges Overlay */}
        <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Top Left Tag Badge (Image 2 style) */}
          <div className="absolute top-2 left-2 z-10">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[9px] font-bold text-white px-2 py-0.5 rounded shadow-2xs uppercase tracking-tight",
                tag.includes("New")
                  ? "bg-emerald-600"
                  : tag.includes("Hot")
                  ? "bg-amber-600"
                  : "bg-cyan-600"
              )}
            >
              {tag.includes("New") && "★"}
              {tag.includes("Hot") && "🔥"}
              {tag.includes("Trending") && "#"}
              <span>{tag}</span>
            </span>
          </div>

          {/* Top Right Heart Wishlist Icon */}
          <button
            onClick={(e) => onToggleWishlist(product.id, e)}
            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer"
            aria-label="Save to wishlist"
          >
            <Heart
              className={cn("w-3.5 h-3.5", isWishlisted && "fill-rose-600 text-rose-600")}
            />
          </button>

          {/* Bottom Left Rating & Size Badge (Image 2 style) */}
          <div className="absolute bottom-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{score}</span>
              <span className="text-slate-400 font-normal text-[9px]">{size}</span>
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 space-y-0.5">
          <div className="text-[11px] font-bold text-slate-900 truncate">
            {product.brand}
          </div>
          <h4 className="text-[11px] font-normal text-slate-500 line-clamp-2 leading-snug">
            {product.title}
          </h4>
        </div>
      </div>

      {/* Footer: Price / Trial Points & Friendly Bright Blue Button */}
      <div className="p-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
        <div>
          {isTrial ? (
            <div className="flex items-center gap-1">
              <div className="w-4.5 h-4.5 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center">
                1
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Trial</span>
                <span className="text-[10px] font-bold font-mono text-slate-800 leading-none mt-0.5">
                  {cost === 0 ? "Point" : `${cost} C`}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <span className="text-[8px] font-semibold text-slate-400 uppercase block leading-none">Price</span>
              <span className="text-xs font-bold font-mono text-slate-900 leading-tight">
                ₹{price.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        {/* Bright Blue Friendly Button (Image 2 style: Try + / Add +) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
        >
          <span>{isTrial ? "Try +" : "Add +"}</span>
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Partner Voucher Card
// -----------------------------------------------------------------------------
interface VoucherCardProps {
  voucher: VoucherItem;
  isCopied: boolean;
  onCopy: (code: string) => void;
}

function VoucherCard({ voucher, isCopied, onCopy }: VoucherCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between text-xs space-y-3 shadow-2xs">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-slate-400 uppercase text-[10px]">{voucher.partner}</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
            {voucher.discount}
          </span>
        </div>
        <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">{voucher.title}</h3>
        <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">{voucher.terms}</p>
      </div>

      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">{voucher.validity}</span>
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
      </div>
    </div>
  );
}
