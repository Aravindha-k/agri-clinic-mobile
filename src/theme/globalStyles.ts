import { FONTS } from "./fonts";
import { Colors, Layout } from "../../mobile/lib/theme";

/** Shared layout tokens — backed by mobile/lib/theme.ts (V2). */
export const DS = {
  bg: Colors.bg,
  surface: Colors.surface,
  border: Colors.border,
  inputBorder: Colors.border2,
  textPrimary: Colors.text1,
  textMuted: Colors.text3,
  textSubtle: Colors.text4,
  accent: Colors.brand700,
  accentDark: Colors.brand700,
  accentBg: Colors.brand50,
  accentBorder: Colors.brand100,
  live: Colors.green,
  tabInactive: Colors.text4,
  danger: Colors.red
} as const;

export const TAB_BAR = {
  backgroundColor: Colors.surface,
  borderTopWidth: Layout.cardBorderWidth,
  borderTopColor: Colors.border,
  height: Layout.tabBarHeight,
  paddingBottom: 10,
  paddingTop: 6,
  activeTintColor: Colors.brand700,
  inactiveTintColor: Colors.text4,
  labelStyle: {
    fontSize: 9,
    fontWeight: "600" as const,
    fontFamily: FONTS.semibold
  },
  iconSize: 22
} as const;

export const STATUS_BAR = {
  barStyle: "dark-content" as const,
  backgroundColor: Colors.bg
};
