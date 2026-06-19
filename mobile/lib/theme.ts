/**
 * Agri Clinic mobile design tokens.
 * Flat design — no drop shadows. System font only.
 */
import { Platform, type ViewStyle } from "react-native";
import { BRAND_COLORS } from "../../src/config/brand";

export const Colors = {
  // Brand — dark clinic green from logo
  brand700: BRAND_COLORS.primary,
  brand500: BRAND_COLORS.secondary,
  brand300: BRAND_COLORS.primary,
  brand100: BRAND_COLORS.primarySoft,
  brand50: "#E8F2EC",

  // Surfaces
  bg: "#f4f4f0",
  surface: "#ffffff",
  border: "#e5e7eb",
  /** Stronger dividers (legacy screens until rebuild) */
  border2: "#d1d5db",

  // Text
  text1: "#111111",
  text2: "#374151",
  text3: "#6b7280",
  text4: "#9ca3af",

  // Semantic
  amber: "#f59e0b",
  amberBg: "#fef3c7",
  amberText: "#92400e",
  red: "#ef4444",
  redBg: "#fef2f2",
  redText: "#991b1b",
  green: BRAND_COLORS.primary,
  greenBg: BRAND_COLORS.primarySoft,
  greenText: BRAND_COLORS.secondary,
  blue: "#3b82f6",
  blueBg: "#eff6ff",
  blueText: "#1e40af",
  purple: "#8b5cf6",
  purpleBg: "#f5f3ff",
  purpleText: "#7e22ce"
} as const;

export type ColorToken = keyof typeof Colors;

export const Radius = {
  /** Inner cards, chips */
  inner: 12,
  /** Primary cards */
  card: 16,
  /** Buttons, inputs */
  button: 14,
  /** Small chips */
  chip: 8,
  /** Pills, avatars (sm/md) */
  pill: 50,
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  avatarSm: 12,
  avatarLg: 16
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  /** Horizontal screen padding */
  screen: 16,
  /** Card internal padding */
  card: 14,
  cardLg: 16
} as const;

export const FontSize = {
  xs: 10,
  sm: 11,
  base: 13,
  md: 14,
  lg: 15,
  xl: 17,
  h2: 18,
  h1: 20,
  hero: 22,
  stat: 28
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const
};

/** Subtle elevation for premium cards — used sparingly on light screens. */
export const Shadow = {
  none: {},
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0f1a14",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 10
    },
    default: { elevation: 2 }
  }),
  cardRaised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0f1a14",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 14
    },
    default: { elevation: 4 }
  })
} as const;

/** Layout constants from design system */
export const Layout = {
  touchTargetMin: 48,
  tabBarHeight: 60,
  cardBorderWidth: 0.5,
  fabSize: 56,
  fabRaise: 18
} as const;

const AVATAR_GREEN: [string, string] = [BRAND_COLORS.primarySoft, BRAND_COLORS.secondary];

const AVATAR_PALETTE: Record<string, [string, string]> = {
  A: ["#dbeafe", "#1d4ed8"],
  B: AVATAR_GREEN,
  C: ["#fce7f3", "#be185d"],
  D: ["#fdf4ff", "#7e22ce"],
  E: ["#dbeafe", "#1d4ed8"],
  F: ["#fef3c7", "#92400e"],
  G: AVATAR_GREEN,
  H: ["#fce7f3", "#be185d"],
  I: ["#eff6ff", "#1e40af"],
  J: AVATAR_GREEN,
  K: ["#fdf4ff", "#7e22ce"],
  L: ["#fef3c7", "#92400e"],
  M: ["#fce7f3", "#be185d"],
  N: ["#dbeafe", "#1d4ed8"],
  O: ["#fdf4ff", "#7e22ce"],
  P: AVATAR_GREEN,
  Q: ["#fef3c7", "#92400e"],
  R: ["#dbeafe", "#1d4ed8"],
  S: AVATAR_GREEN,
  T: ["#fdf4ff", "#7e22ce"],
  U: ["#fce7f3", "#be185d"],
  V: ["#eff6ff", "#1e40af"],
  W: ["#fef3c7", "#92400e"],
  X: ["#dbeafe", "#1d4ed8"],
  Y: AVATAR_GREEN,
  Z: ["#fdf4ff", "#7e22ce"]
};

const AVATAR_FALLBACK: [string, string] = ["#f3f4f6", "#374151"];

/** Deterministic avatar colors from the first letter of the name. */
export function getAvatarColors(name: string): [string, string] {
  const trimmed = name.trim();
  if (!trimmed) return AVATAR_FALLBACK;
  const letter = trimmed[0].toUpperCase();
  return AVATAR_PALETTE[letter] ?? AVATAR_FALLBACK;
}

/** First letter of first + last name, or first two characters. */
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}
