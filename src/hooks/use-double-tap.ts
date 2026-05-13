"use client";

import { useCallback, useRef } from "react";

const MOVE_PX = 14;

/**
 * Fire `onDoubleTap` after two quick taps on the same element (touch).
 * Ignores obvious scroll drags using touchmove delta.
 */
export function useDoubleTap(onDoubleTap: () => void, delayMs = 320) {
  const lastTapRef = useRef(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    startRef.current = { x: t.clientX, y: t.clientY };
    movedRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const s = startRef.current;
    if (!t || !s) return;
    if (
      Math.abs(t.clientX - s.x) > MOVE_PX ||
      Math.abs(t.clientY - s.y) > MOVE_PX
    ) {
      movedRef.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (movedRef.current) {
      startRef.current = null;
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < delayMs) {
      lastTapRef.current = 0;
      onDoubleTap();
    } else {
      lastTapRef.current = now;
    }
    startRef.current = null;
  }, [delayMs, onDoubleTap]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
