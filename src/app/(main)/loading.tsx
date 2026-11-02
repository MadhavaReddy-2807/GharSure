import React from "react";

export default function GenericMainLoading() {
  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto py-4 animate-pulse" aria-busy="true">
      <div className="h-8 w-48 bg-slate-200 rounded-md" />
      <div className="h-4 w-72 bg-slate-100 rounded" />
      <div className="h-48 w-full bg-slate-100 rounded-2xl border border-slate-200" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
