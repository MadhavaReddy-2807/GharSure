import React from "react";

export default function RewardsLoading() {
  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-16 animate-pulse" aria-busy="true">
      {/* 1. Rewards Hero Summary Skeleton */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-amber-200/80 rounded" />
            <div className="h-8 w-48 bg-amber-200 rounded-md" />
          </div>
          <div className="h-10 w-36 bg-amber-200 rounded-xl" />
        </div>
      </div>

      {/* 2. Activity Tabs Skeleton */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <div className="h-9 w-28 bg-slate-200 rounded-lg" />
        <div className="h-9 w-28 bg-slate-100 rounded-lg" />
        <div className="h-9 w-28 bg-slate-100 rounded-lg" />
      </div>

      {/* 3. Task Cards Skeleton List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
              </div>
              <div className="h-7 w-20 bg-amber-100 rounded-full" />
            </div>
            <div className="h-10 w-full bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
