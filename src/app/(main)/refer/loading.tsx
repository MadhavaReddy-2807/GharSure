import React from "react";

export default function ReferLoading() {
  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-12 animate-pulse" aria-busy="true">
      {/* 1. Page Header Skeleton */}
      <div className="pb-4 border-b border-slate-200 space-y-1.5">
        <div className="h-7 w-44 bg-slate-200 rounded-md" />
        <div className="h-4 w-72 bg-slate-100 rounded" />
      </div>

      {/* 2. Stats Strip Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="h-6 w-16 bg-slate-200 rounded font-mono" />
          </div>
        ))}
      </div>

      {/* 3. Referral Code Card Skeleton */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-12 w-full max-w-md bg-slate-100 rounded-xl" />
        <div className="h-10 w-36 bg-blue-100 rounded-xl" />
      </div>
    </div>
  );
}
