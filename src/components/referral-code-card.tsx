"use client";

import React, { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { getBaseUrl } from "@/lib/base-url";

interface ReferralCodeCardProps {
  code: string;
  bonusCoins?: number;
}

export function ReferralCodeCard({ code, bonusCoins = 100 }: ReferralCodeCardProps) {
  const [codeCopied, setCodeCopied] = useState(false);

  const getShareUrl = () => {
    return `${getBaseUrl()}/?ref=${code}`;
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

  const handleWhatsAppShare = () => {
    const url = getShareUrl();
    const shareText = encodeURIComponent(
      `Join me on GharSure with my invite code ${code} to get ${bonusCoins} bonus coins for household essentials & trials: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Your Invite Code
          </span>
          <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            +{bonusCoins} Coins Per Neighbor
          </span>
        </div>

        {/* Code Box */}
        <div className="my-3.5 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 tracking-wider select-all">
            {code}
          </span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
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
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          Share with your apartment WhatsApp group or society neighbors. Both of you receive {bonusCoins} bonus coins when they verify their phone.
        </p>
      </div>

      <button
        type="button"
        onClick={handleWhatsAppShare}
        className="w-full py-2 px-3.5 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <Share2 className="w-4 h-4" />
        <span>Share on WhatsApp</span>
      </button>
    </div>
  );
}
