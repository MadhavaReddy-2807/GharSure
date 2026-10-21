import React from "react";
import { ShoppingBag, Star, ShieldCheck } from "lucide-react";

export default async function StorePage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-brand-orange flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-brand-navy">GharSure Verified Store</h1>
        <p className="text-xs text-slate-600 mt-1">
          Lab-tested water filter cartridges, anti-scale tap aerators, and genuine spares.
        </p>
      </div>

      <h2 className="text-sm font-bold text-brand-navy tracking-wide uppercase px-1">
        Featured Essentials
      </h2>

      <div className="space-y-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
              Lab Verified
            </span>
            <h3 className="text-sm font-bold text-brand-navy">
              Universal Sediment Pre-Filter (5 Micron)
            </h3>
            <p className="text-xs text-slate-500">
              Compatible with Kent, Aquaguard, Pureit RO systems.
            </p>
            <div className="flex items-center gap-1 text-xs text-amber-500 pt-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold text-slate-700">4.9</span>
              <span className="text-slate-400">(412 reviews)</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-extrabold text-brand-navy">₹349</div>
            <span className="text-[10px] text-slate-400 line-through">₹599</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
              Energy Saver
            </span>
            <h3 className="text-sm font-bold text-brand-navy">
              Anti-Clog Brass Tap Aerator Set (Pack of 3)
            </h3>
            <p className="text-xs text-slate-500">
              Prevents calcium scale accumulation, saves 40% water.
            </p>
            <div className="flex items-center gap-1 text-xs text-amber-500 pt-1">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-bold text-slate-700">4.8</span>
              <span className="text-slate-400">(228 reviews)</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-extrabold text-brand-navy">₹499</div>
            <span className="text-[10px] text-slate-400 line-through">₹799</span>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Free delivery on all verified orders with 7-day money-back guarantee.</span>
      </div>
    </div>
  );
}
