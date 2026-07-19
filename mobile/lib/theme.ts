/**
 * Agri Clinic mobile design tokens — enterprise field workforce system.
 */
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { BRAND_COLORS } from "../../src/config/brand";

export const Colors = {
  // Brand — deep clinic green
  brand700: BRAND_COLORS.primary,
  brand500: BRAND_COLORS.secondary,
  brand300: BRAND_COLORS.primary,
  brand100: BRAND_COLORS.primarySoft,
  brand50: "#E8F2EC",

  // Surfaces
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  surfaceMuted: "#F4F7F5",
  border: "#E8EBE9",
  border2: "#D1D5DB",

  // Text hierarchy
  text1: "#111827",
  text2: "#374151",
  text3: "#6B7280",
  /**
   * Muted readable text/icon color.
   * Raised slightly for WCAG AA (~4.5:1+) on white and common tinted surfaces (bg / surfaceMuted).
   * Prefer Semantic.textMutedReadable for new UI.
   */
  text4: "#5B6B7A",
  /** Alias kept for gradual migration — same as text4. */
  textMutedReadable: "#5B6B7A",

  // Semantic
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
  amberText: "#92400E",
  red: "#EF4444",
  redBg: "#FEF2F2",
  redText: "#991B1B",
  green: BRAND_COLORS.primary,
  greenBg: BRAND_COLORS.primarySoft,
  greenText: BRAND_COLORS.secondary,
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  blueText: "#1E40AF",
  purple: "#8B5CF6",
  purpleBg: "#F5F3FF",
  purpleText: "#7E22CE",

  /** Text/icons on brand primary surfaces */
  onPrimary: "#FFFFFF",
  onPrimaryMuted: "rgba(255, 255, 255, 0.65)",
  onPrimaryGlass: "rgba(255, 255, 255, 0.15)",
  /** Photo overlay / scrims */
  overlay: "rgba(17, 24, 39, 0.45)",
  photoOverlay: "rgba(0, 0, 0, 0.55)",
  scrim: "rgba(17, 24, 39, 0.92)",
  placeholder: "#5B6B7A",
  inputFill: "#F3F4F6",
  disabled: "#9CA3AF",
  disabledBg: "#F3F4F6"
} as const;

/**
 * Semantic color aliases — prefer these in new UI.
 * Values point at the same palette (no random hex).
 */
export const Semantic = {
  primary: Colors.brand700,
  secondary: Colors.brand500,
  background: Colors.bg,
  surface: Colors.surface,
  border: Colors.border,
  borderSubtle: Colors.border,
  success: Colors.green,
  successBg: Colors.greenBg,
  warning: Colors.amber,
  warningBg: Colors.amberBg,
  error: Colors.red,
  errorBg: Colors.redBg,
  info: Colors.blue,
  infoBg: Colors.blueBg,
  disabled: Colors.disabled,
  disabledText: Colors.disabled,
  disabledBackground: Colors.disabledBg,
  disabledBg: Colors.disabledBg,
  textPrimary: Colors.text1,
  textSecondary: Colors.text2,
  textMuted: Colors.text3,
  /** Prefer for captions/helpers that must stay readable on tinted cards. */
  textMutedReadable: Colors.textMutedReadable,
  textDisabled: Colors.disabled
} as const;

export type ColorToken = keyof typeof Colors;

/** Enterprise spacing scale */
export const Enterprise = {
  spacing: {
    s4: 4,
    s8: 8,
    s12: 12,
    s16: 16,
    s20: 20,
    s24: 24,
    s32: 32,
    s40: 40,
    s48: 48,
    s64: 64
  },
  radius: {
    card: 24,
    list: 20,
    input: 16,
    button: 16,
    sheet: 28,
    inner: 14,
    tile: 22,
    hero: 26
  },
  buttonHeight: 52,
  motion: {
    fast: 150,
    normal: 200,
    slow: 220
  }
} as const;

export const Radius = {
  inner: Enterprise.radius.inner,
  card: Enterprise.radius.card,
  list: Enterprise.radius.list,
  button: Enterprise.radius.button,
  input: Enterprise.radius.input,
  sheet: Enterprise.radius.sheet,
  chip: 8,
  pill: 50,
  /** Named aliases for enterprise guidelines */
  small: 8,
  medium: 12,
  large: 16,
  xl: 18,
  xxl: 20,
  full: 999,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  avatarSm: 12,
  avatarLg: 16
} as const;

export const Spacing = {
  xs: 4,
  sm: Enterprise.spacing.s8,
  md: Enterprise.spacing.s12,
  lg: Enterprise.spacing.s16,
  xl: Enterprise.spacing.s20,
  xxl: Enterprise.spacing.s24,
  xxxl: Enterprise.spacing.s32,
  huge: Enterprise.spacing.s40,
  massive: Enterprise.spacing.s48,
  screen: Enterprise.spacing.s16,
  card: Enterprise.spacing.s12,
  cardLg: Enterprise.spacing.s16
} as const;

export const FontSize = {
  caption: 13,
  body: 16,
  bodyLarge: 17,
  md: 16,
  lg: 16,
  section: 18,
  subtitle: 18,
  h4: 16,
  h3: 18,
  h2: 20,
  title: 22,
  h1: 24,
  heading: 26,
  display: 32,
  hero: 32,
  stat: 28,
  label: 12,
  small: 14,
  /** Legacy — avoid for new UI */
  xs: 13,
  sm: 13,
  base: 16,
  xl: 18
} as const;

export const FontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const
};

/** Reusable text styles — prefer these over ad-hoc fontSize/fontWeight. */
export const TextStyles = {
  display: {
    color: Colors.text1,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.4
  } satisfies TextStyle,
  h1: {
    color: Colors.text1,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2
  } satisfies TextStyle,
  h2: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.semibold
  } satisfies TextStyle,
  h3: {
    color: Colors.text1,
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold
  } satisfies TextStyle,
  h4: {
    color: Colors.text1,
    fontSize: FontSize.h4,
    fontWeight: FontWeight.semibold
  } satisfies TextStyle,
  bodyLarge: {
    color: Colors.text1,
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.regular,
    lineHeight: 24
  } satisfies TextStyle,
  body: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.regular,
    lineHeight: 22
  } satisfies TextStyle,
  small: {
    color: Colors.text2,
    fontSize: FontSize.small,
    fontWeight: FontWeight.regular,
    lineHeight: 20
  } satisfies TextStyle,
  caption: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  } satisfies TextStyle,
  label: {
    color: Colors.text2,
    fontSize: FontSize.label,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
    textTransform: "uppercase"
  } satisfies TextStyle,
  button: {
    color: Colors.onPrimary,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold
  } satisfies TextStyle
} as const;

export const IconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28
} as const;

/** Very soft elevation — enterprise cards only. */
export const Shadow = {
  none: {},
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 8
    },
    default: { elevation: 1 }
  }),
  cardRaised: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0B3D28",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius: 14
    },
    default: { elevation: 3 }
  }),
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#062818",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20
    },
    default: { elevation: 6 }
  }),
  sheet: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16
    },
    default: { elevation: 8 }
  }),
  dialog: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 24
    },
    default: { elevation: 12 }
  }),
  fab: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#062818",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12
    },
    default: { elevation: 8 }
  })
} as const;

/** Elevation aliases matching enterprise guidelines. */
export const Elevation = {
  card: Shadow.card,
  floating: Shadow.float,
  bottomSheet: Shadow.sheet,
  dialog: Shadow.dialog,
  fab: Shadow.fab
} as const;

/** Layout constants from design system */
export const Layout = {
  touchTargetMin: 48,
  buttonHeight: Enterprise.buttonHeight,
  tabBarHeight: 58,
  cardBorderWidth: StyleSheet.hairlineWidth,
  fabSize: 56,
  fabRaise: 18,
  /** Extra scroll padding below tab bar inset */
  scrollBottomExtra: Spacing.xl,
  /** Bottom padding on stack screens (gesture nav clearance) */
  stackScrollBottom: Spacing.xxxl,
  iconHitSlop: 12
} as const;

/** Minimum 48dp touch target — apply to icon-only controls. */
export const minTouchStyle: ViewStyle = {
  minWidth: Layout.touchTargetMin,
  minHeight: Layout.touchTargetMin,
  alignItems: "center",
  justifyContent: "center"
};

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
