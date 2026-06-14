/** Standard rhythm: 4 · 8 · 12 · 16 · 24 · 32 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** @deprecated Use xl (24) */
  xxxl: 36
} as const;

/** @deprecated Use spacing */
export const space = spacing;
