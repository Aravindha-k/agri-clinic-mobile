import { BRAND_COLORS } from "../brand/constants";

/** Auth palette — official clinic greens only (no neon accents). */
export const AUTH_THEME = {
  bg: "#050D0A",
  bgMid: BRAND_COLORS.secondary,
  bgGlow: BRAND_COLORS.primary,
  overlay: "rgba(5, 13, 10, 0.72)",
  text: BRAND_COLORS.accent,
  textMuted: "rgba(255,255,255,0.68)",
  textDim: "rgba(255,255,255,0.45)",
  highlight: BRAND_COLORS.accent,
  highlightMid: "rgba(255,255,255,0.92)",
  highlightDark: BRAND_COLORS.primary,
  glass: "rgba(255,255,255,0.07)",
  glassBorder: "rgba(255,255,255,0.14)",
  glassFocus: "rgba(255,255,255,0.45)",
  danger: "#FF6B6B",
  dangerBg: "rgba(255,107,107,0.12)",
  chip: "rgba(255,255,255,0.1)",
  /** @deprecated Use highlight — kept for gradual migration */
  neon: BRAND_COLORS.accent,
  neonMid: "rgba(255,255,255,0.92)",
  neonDark: BRAND_COLORS.primary
} as const;
