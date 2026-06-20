/**
 * Single source of truth for in-progress / WIP features.
 *
 * Flip a flag to `true` to surface the corresponding UI. Underlying
 * code (store slices, services, types) stays compiled even when the
 * flag is off so re-enabling is a one-line change.
 */
export const FEATURES = {} as const;

export type FeatureKey = keyof typeof FEATURES;
