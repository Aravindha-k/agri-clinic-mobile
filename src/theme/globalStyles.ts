import { FONTS } from "./fonts";
import { ENT } from "./enterprise";

/** Enterprise design tokens — shared across tab bar and main app screens. */
export const DS = {
  bg: ENT.bg,
  surface: ENT.card,
  border: ENT.border,
  inputBorder: ENT.borderStrong,
  textPrimary: ENT.text,
  textMuted: ENT.textSecondary,
  textSubtle: ENT.textMuted,
  accent: ENT.primary,
  accentDark: ENT.primary,
  accentBg: ENT.primarySoft,
  accentBorder: ENT.primaryMuted,
  live: ENT.primary,
  tabInactive: ENT.textMuted,
  danger: ENT.danger
} as const;

export const TAB_BAR = {
  backgroundColor: ENT.card,
  borderTopWidth: 1,
  borderTopColor: ENT.border,
  height: 64,
  paddingBottom: 10,
  paddingTop: 6,
  activeTintColor: ENT.primary,
  inactiveTintColor: ENT.textMuted,
  labelStyle: {
    fontSize: 9,
    fontWeight: "600" as const,
    fontFamily: FONTS.semibold
  },
  iconSize: 22
} as const;

export const STATUS_BAR = {
  barStyle: "dark-content" as const,
  backgroundColor: ENT.bg
};
