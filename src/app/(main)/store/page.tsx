import React from "react";
import { isDirectDatabaseConfigured, getDirectSql } from "@/lib/supabase/direct-db";
import { PackageOpen, ShieldCheck } from "lucide-react";

export default async function StorePage() {
  let products: any[] = [];
  if (isDirectDatabaseConfigured()) {
    try {
      const sql = getDirectSql();
      products = await sql`
        SELECT id, title, summary, price_inr, brand, category, score
        FROM products
        WHERE status = 'PUBLISHED'
        ORDER BY created_at DESC;
      `;
    } catch {
      products = [];
    }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Store Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy tracking-tight">
          GharSure Store
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Verified water filtration cartridges and appliance maintenance spares for your home.
        </p>
      </div>

      {/* Product Grid */}
      <div>
        <h2 className="text-sm font-bold text-brand-navy uppercase tracking-wider mb-3 px-1">
          Maintenance Essentials
        </h2>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <PackageOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No Verified Products Listed
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Products and genuine spares are listed after laboratory testing and quality verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">
                      {product.brand} · {product.category}
                    </span>
                    {product.score && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {Number(product.score).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-brand-navy mb-1.5">
                    {product.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-4">
                    {product.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-brand-navy font-mono">
                    ₹{Number(product.price_inr).toLocaleString("en-IN")}
                  </span>
                  <button className="px-4 py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold hover:bg-brand-orange-600 transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
