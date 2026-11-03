"use client";

import { useEffect, useCallback } from "react";

// Global active modal counter to handle multiple or nested overlays safely
let activeOverlayCount = 0;

/**
 * Hook to lock body scroll and handle Escape key for modals, drawers, and popups.
 * Guaranteed to clean up and restore scroll when all overlays close.
 */
export function useOverlayControl(
  isOpen: boolean,
  onClose: () => void,
  options: { lockScroll?: boolean; closeOnEscape?: boolean } = {}
) {
  const { lockScroll = true, closeOnEscape = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    if (closeOnEscape) {
      window.addEventListener("keydown", handleKeyDown);
    }

    if (lockScroll) {
      activeOverlayCount++;
      document.body.style.overflow = "hidden";
    }

    return () => {
      if (closeOnEscape) {
        window.removeEventListener("keydown", handleKeyDown);
      }
      if (lockScroll) {
        activeOverlayCount = Math.max(0, activeOverlayCount - 1);
        if (activeOverlayCount === 0) {
          document.body.style.removeProperty("overflow");
        }
      }
    };
  }, [isOpen, handleKeyDown, lockScroll, closeOnEscape]);
}
