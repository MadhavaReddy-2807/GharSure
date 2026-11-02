import React from "react";

export default function HomeLoading() {
  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto pb-16 animate-pulse" aria-busy="true">
      {/* 1. Resident Greeting & Balance Summary Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-7 w-52 bg-slate-200 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-slate-200 rounded-full" />
          <div className="h-9 w-24 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* 2. Hero Banner Skeleton */}
      <div className="h-48 sm:h-64 w-full rounded-2xl bg-slate-200" />

      {/* 3. Quick Poll / Survey Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-6 w-20 bg-slate-200 rounded-full" />
        </div>
        <div className="h-5 w-3/4 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="h-12 bg-slate-100 rounded-xl border border-slate-200" />
          <div className="h-12 bg-slate-100 rounded-xl border border-slate-200" />
        </div>
      </div>

      {/* 4. Trending Products Shelf Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-44 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5">
              <div className="aspect-square w-full bg-slate-100 rounded-lg" />
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-4 w-14 bg-slate-200 rounded" />
                <div className="h-7 w-16 bg-slate-200 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
