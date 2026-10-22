"use client";

import React, { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "./ui/button";

interface ReferralCodeCardProps {
  code: string;
}

export function ReferralCodeCard({ code }: ReferralCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join GharSure",
          text: `Use my invite code ${code} on GharSure to get 100 bonus coins for free home water & appliance trials:`,
          url: window.location.origin + "/auth",
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Your Invite Code
        </span>

        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <span className="text-2xl font-mono font-bold text-brand-navy tracking-widest select-all">
            {code}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-brand-orange hover:border-brand-orange transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
          Share your code with neighbors. Both of you receive bonus coins redeemable for home trial kits.
        </p>
      </div>

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleShare}
        className="w-full text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        <span>Share Invite Link</span>
      </Button>
    </div>
  );
}
