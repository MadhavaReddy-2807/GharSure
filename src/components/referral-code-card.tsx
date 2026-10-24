"use client";

import React, { useState } from "react";
import { Copy, Check, Share2, Link as LinkIcon } from "lucide-react";
import { Button } from "./ui/button";

interface ReferralCodeCardProps {
  code: string;
  bonusCoins?: number;
}

export function ReferralCodeCard({ code, bonusCoins = 100 }: ReferralCodeCardProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/?ref=${code}`;
    }
    return `https://gharsure.com/?ref=${code}`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const shareText = `Join me on GharSure with my invite code ${code} to get ${bonusCoins} bonus coins for free home water & appliance trials:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join GharSure",
          text: shareText,
          url,
        });
        return;
      } catch {
        // Fallback to copy link
      }
    }
    handleCopyLink();
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your Invite Code
          </span>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            +{bonusCoins} Coins Per Neighbor
          </span>
        </div>

        {/* Code Box */}
        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <span className="text-2xl font-mono font-bold text-brand-navy tracking-widest select-all">
            {code}
          </span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-brand-orange hover:border-brand-orange transition-colors cursor-pointer"
            title="Copy referral code"
          >
            {codeCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
          Share your invite link with your society neighbors or WhatsApp groups. Both of you receive {bonusCoins} bonus coins instantly when they verify and join.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleShare}
          className="flex-1 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Invite Link</span>
        </Button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          {linkCopied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Link Copied!</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4 text-slate-500" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
