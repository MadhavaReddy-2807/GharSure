"use client";

import React, { useState, useMemo } from "react";
import {
  PackageOpen,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  X,
  FileText,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
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
    setTimeout(() => setCartSuccess(null), 3500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-5xl mx-auto">
      {/* Store Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-purple" />
            <span>Lab Verified Spares & Filters</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            GharSure Store
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Genuine RO filter cartridges, water descalers, and verified appliance spares tested for your city&apos;s water telemetry.
          </p>
        </div>

        {/* Lab Guarantee Badge */}
        <div className="bg-purple-50/60 border border-purple-100 p-3.5 rounded-xl flex items-center gap-3 self-start md:self-center">
          <div className="w-8 h-8 rounded-lg bg-brand-purple text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-slate-900 leading-tight">100% OEM Compatibility</div>
            <div className="text-[11px] text-slate-500">Tested against water hardness scaling</div>
          </div>
        </div>
      </div>

      {/* Cart Feedback Toast */}
      {cartSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between animate-fade-in shadow-xs">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search parts, brands..."
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200/90 shadow-xs text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Products Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No items match "${searchQuery}". Try searching for another brand or category.`
              : "No verified products are listed in this category yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((product) => {
            const price = Number(product.price_inr) || 0;
            const score = product.score ? Number(product.score).toFixed(1) : null;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {product.brand} · {product.category}
                    </span>
                    {score && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{score} / 10 Lab Score</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1.5 leading-snug">
                    {product.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
                    {product.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Verified Price
                      </span>
                      <span className="text-lg font-bold text-slate-900 font-mono">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Scorecard</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order Genuine Part</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lab Scorecard & Evidence Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Lab Scorecard & Evidence</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  {selectedProduct.brand}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedProduct.title}
                </h2>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  {selectedProduct.summary}
                </p>
              </div>

              {selectedProduct.score && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-emerald-700 uppercase font-bold">
                      GharSure Lab Verification Score
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-900 mt-0.5">
                      {Number(selectedProduct.score).toFixed(1)} / 10.0
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    Passed Quality Audit
                  </span>
                </div>
              )}

              {/* Specifications */}
              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-1.5">
                    Technical Specifications
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200/70 overflow-hidden">
                    {Object.entries(selectedProduct.specifications).map(([k, v]) => (
                      <div key={k} className="p-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">{k}</span>
                        <span className="text-slate-900 font-semibold text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-lg font-bold font-mono text-slate-900">
                  ₹{Number(selectedProduct.price_inr).toLocaleString("en-IN")}
                </span>

                <button
                  onClick={() => {
                    handleAddToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
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
