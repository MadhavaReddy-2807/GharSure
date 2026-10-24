"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ReferralParamCapturerInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref && ref.trim()) {
      const cleanRef = ref.trim().toUpperCase();
      try {
        sessionStorage.setItem("gharsure_pending_ref", cleanRef);
        // Also persist in document cookie with 7-day max-age for cross-tab preservation
        document.cookie = `gharsure_pending_ref=${cleanRef}; path=/; max-age=604800; SameSite=Lax`;
      } catch {
        // Storage disabled/restricted fallback
      }
    }
  }, [searchParams]);

  return null;
}

export function ReferralParamCapturer() {
  return (
    <Suspense fallback={null}>
      <ReferralParamCapturerInner />
    </Suspense>
  );
}
