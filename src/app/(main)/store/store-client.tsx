"use client";

import React, { useState, useMemo } from "react";
import {
  PackageOpen,
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  ShoppingBag,
  Info,
} from "lucide-react";

interface ProductItem {
  id: string;
  title: string;
  summary: string;
  price_inr: string | number;
  brand: string;
  category: string;
  score: number | null;
  specifications?: Record<string, any>;
  scorecard_details?: Record<string, any>;
  evidence_sources?: Array<{ source: string; type: string }>;
}

export function StoreClientView({ initialProducts }: { initialProducts: ProductItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    initialProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set)];
  }, [initialProducts]);

  // Filtered products
  const filtered = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const matchSearch =
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [initialProducts, selectedCategory, searchQuery]);

  const handleAddToCart = (product: ProductItem) => {
    setCartSuccess(`Added "${product.title}" to order basket.`);
    setTimeout(() => setCartSuccess(null), 3000);
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-5xl mx-auto">
      {/* Store Header */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            GharSure Store
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Genuine RO filter cartridges, water descalers, and appliance spares verified for city water conditions.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 self-start md:self-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>OEM Verified Spares</span>
        </div>
      </div>

      {/* Cart Feedback Toast */}
      {cartSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cartSuccess}</span>
          </div>
          <button onClick={() => setCartSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? "bg-brand-purple text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parts, brands..."
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-purple transition-colors"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2 border border-slate-100">
            <PackageOpen className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">No Products Found</h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
            {searchQuery
              ? `No items match "${searchQuery}". Try another search keyword.`
              : "No products are listed in this category yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((product) => {
            const price = Number(product.price_inr) || 0;
            const score = product.score ? Number(product.score).toFixed(1) : null;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {product.brand} · {product.category}
                    </span>
                    {score && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{score} Score</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1 leading-snug">
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
                        Price
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-purple hover:underline cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full h-8 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order Part</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-5 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase">Product Details</h3>
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
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  {selectedProduct.brand}
                </span>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedProduct.title}
                </h2>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  {selectedProduct.summary}
                </p>
              </div>

              {selectedProduct.score && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
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
                    Specifications
                  </h4>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                      <div key={k} className="p-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">{k}</span>
                        <span className="text-slate-900 font-semibold text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{Number(selectedProduct.price_inr).toLocaleString("en-IN")}
                </span>

                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Order Part</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
