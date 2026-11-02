import React from "react";

export default function ProfileLoading() {
  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto pb-16 animate-pulse" aria-busy="true">
      {/* 1. Account Summary Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-44 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-100 rounded" />
          </div>
        </div>
      </div>

      {/* 2. Stats Grid Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="h-3.5 w-20 bg-slate-200 rounded" />
            <div className="h-6 w-12 bg-slate-200 rounded font-mono" />
          </div>
        ))}
      </div>

      {/* 3. Details Form Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-36 bg-slate-200 rounded" />
        <div className="space-y-3">
          <div className="h-10 w-full bg-slate-100 rounded-lg" />
          <div className="h-10 w-full bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
