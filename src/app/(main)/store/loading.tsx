import React from "react";

export default function StoreLoading() {
  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-16 animate-pulse" aria-busy="true">
      {/* 1. Header Banner & Search Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="h-6 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-64 bg-slate-100 rounded" />
          </div>
          <div className="h-9 w-32 bg-slate-100 rounded-full" />
        </div>
        <div className="h-11 w-full bg-slate-100 rounded-xl" />
      </div>

      {/* 2. Category Filter Pills Skeleton */}
      <div className="flex gap-2 overflow-x-hidden py-1">
        {[80, 100, 90, 110, 85, 95].map((w, idx) => (
          <div
            key={idx}
            className="h-9 bg-slate-200 rounded-full shrink-0"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>

      {/* 3. Merchandising Shelf Skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-2.5 space-y-2">
              <div className="aspect-square w-full bg-slate-100 rounded-lg" />
              <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Products Grid Skeleton */}
      <div className="space-y-4 pt-2">
        <div className="h-5 w-36 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-3">
              <div className="aspect-square w-full bg-slate-100 rounded-lg" />
              <div className="h-4 w-4/5 bg-slate-200 rounded" />
              <div className="h-3 w-3/5 bg-slate-100 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 w-16 bg-slate-200 rounded" />
                <div className="h-8 w-20 bg-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
