export const GE = {
  g1: "#0d7a5f",
  g2: "#14947a",
  g3: "#1aac8a",
  g4: "#1fc8a0",

  glass: "rgba(255,255,255,0.14)",
  glassLight: "rgba(255,255,255,0.10)",
  glassStrong: "rgba(255,255,255,0.20)",
  glassBorder: "rgba(255,255,255,0.22)",
  glassBorderLight: "rgba(255,255,255,0.14)",

  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.75)",
  textMuted: "rgba(255,255,255,0.45)",
  textFaint: "rgba(255,255,255,0.28)",

  white: "#ffffff",
  whiteHigh: "rgba(255,255,255,0.92)",
  danger: "rgba(251,113,133,0.25)",
  dangerBorder: "rgba(251,113,133,0.40)",
  dangerText: "#fda4af",

  cardShadow: "0 3px 14px rgba(0,0,0,0.10)",
  fabShadow: "0 4px 18px rgba(0,0,0,0.20)",

  darkGlass: "rgba(0,0,0,0.15)",
  darkGlassStrong: "rgba(0,0,0,0.18)",
  darkGlassBorder: "rgba(255,255,255,0.15)"
} as const;

export const GE_GRADIENT = [GE.g1, GE.g2, GE.g3, GE.g4] as const;

export const GE_SECTION_LABEL = {
  color: "rgba(255,255,255,0.55)",
  fontFamily: "Inter_700Bold",
  fontSize: 10,
  fontWeight: "700" as const,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
  marginBottom: 8
};
