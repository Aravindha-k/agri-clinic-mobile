/** Shared seed-grow pacing — one full grow cycle ≈ 4.4s (not rushed, not sluggish). */
export const SEED_GROW_TIMING = {
  growUpMs: 2200,
  growDownMs: 2200,
  swayHalfMs: 2400,
  glowHalfMs: 2200,
  seedPulseHalfMs: 2200
} as const;
