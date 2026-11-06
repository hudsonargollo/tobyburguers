"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// true on the client after hydration, false during SSR / the hydration pass.
// Replaces the `useEffect(() => setMounted(true), [])` pattern without an
// extra cascading render.
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}
