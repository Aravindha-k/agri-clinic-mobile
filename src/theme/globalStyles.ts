import { FONTS } from "./fonts";

/** Part 1 design tokens — shared across tab bar and screens. */
export const DS = {
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#f1f5f9",
  inputBorder: "#e2e8f0",
  textPrimary: "#0f172a",
  textMuted: "#94a3b8",
  textSubtle: "#64748b",
  accent: "#16a34a",
  accentBg: "#f0fdf4",
  tabInactive: "#cbd5e1",
  danger: "#dc2626"
} as const;

export const TAB_BAR = {
  backgroundColor: DS.surface,
  borderTopWidth: 1,
  borderTopColor: DS.border,
  height: 64,
  paddingBottom: 10,
  paddingTop: 6,
  activeTintColor: DS.accent,
  inactiveTintColor: DS.tabInactive,
  labelStyle: {
    fontSize: 9,
    fontWeight: "600" as const,
    fontFamily: FONTS.semibold
  },
  iconSize: 22
} as const;

export const STATUS_BAR = {
  barStyle: "dark-content" as const,
  backgroundColor: DS.surface
};
