"use client";

import { useEffect, useCallback } from "react";

/**
 * Hook to lock body scroll and handle Escape key for modals, drawers, and popups.
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

    let originalOverflow = "";
    if (lockScroll) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    return () => {
      if (closeOnEscape) {
        window.removeEventListener("keydown", handleKeyDown);
      }
      if (lockScroll) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [isOpen, handleKeyDown, lockScroll, closeOnEscape]);
}
