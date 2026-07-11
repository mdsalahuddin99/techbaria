import { usePosStore } from "@/store/usePosStore";

/**
 * Snapshot + restore the Zustand store so tests stay isolated.
 * Call `snap = snapshotStore()` in beforeEach and `snap.restore()` in afterEach.
 */
export function snapshotStore() {
  const initial = usePosStore.getState();
  // Shallow clone of the slice we mutate in tests; arrays/objects are
  // re-assigned (not deep-cloned) since stores treat them immutably.
  const saved = { ...initial };
  return {
    restore() {
      usePosStore.setState(saved, true);
    },
  };
}

/** Reset cart-related fields between POS tests. */
export function resetCart() {
  usePosStore.setState({ cart: [], discount: 0 });
}
