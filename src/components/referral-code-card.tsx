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

  const handleWhatsAppShare = () => {
    const url = getShareUrl();
    const shareText = encodeURIComponent(
      `Join me on GharSure with my invite code ${code} to get ${bonusCoins} bonus coins for home water & appliance trials: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Personal Invite Code
          </span>
          <span className="text-[11px] font-bold text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full border border-brand-orange/20">
            +{bonusCoins} Coins Per Neighbor
          </span>
        </div>

        {/* Code Box */}
        <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-inner">
          <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-widest select-all">
            {code}
          </span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer shadow-xs"
            title="Copy referral code"
          >
            {codeCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          Share with your apartment WhatsApp group or society neighbors. Both of you receive {bonusCoins} bonus coins automatically as soon as their phone is verified.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share on WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          {linkCopied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Link Copied!</span>
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4 text-slate-400" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
