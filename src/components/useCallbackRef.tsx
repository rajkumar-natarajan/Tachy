"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Returns a stable function identity that always calls the latest callback.
 * Useful to avoid re-running effects when a handler prop changes.
 */
export function useCallbackRef<T extends (...args: never[]) => unknown>(callback: T): T {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  });
  return useMemo(() => ((...args: never[]) => ref.current(...args)) as T, []);
}
