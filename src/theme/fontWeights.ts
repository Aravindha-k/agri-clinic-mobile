/** Consistent font weights — use these instead of raw strings in UI. */
export const fontWeights = {
  regular: "400",
  medium: "600",
  semibold: "700",
  bold: "800",
  heavy: "900"
} as const;

export type FontWeightToken = keyof typeof fontWeights;
