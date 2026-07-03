/**
 * Kavya Agri Clinic — enterprise design system (8pt grid, Material 3–inspired).
 * UI tokens only — no business logic.
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";

/** 8-point spacing grid */
export const Grid = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64
} as const;

/** Agriculture enterprise palette */
export const Harvest = {
  forest: "#0B3D28",
  forestDeep: "#062818",
  leaf: "#2E9B64",
  leafBright: "#4ADE80",
  harvest: "#D4A017",
  harvestSoft: "rgba(212, 160, 23, 0.14)",
  sky: "#3B82C4",
  skySoft: "rgba(59, 130, 196, 0.12)",
  warmWhite: "#FAF9F6",
  card: "#FFFFFF",
  cardMuted: "#F4F7F5",
  border: "rgba(15, 61, 40, 0.08)",
  borderStrong: "rgba(15, 61, 40, 0.14)",
  text: "#0D1B14",
  textSecondary: "#4A5C52",
  textMuted: "#6B7F74",
  success: "#16A34A",
  warning: "#D97706"
} as const;

/** Premium corner radii */
export const PremiumRadius = {
  sm: 14,
  md: 20,
  card: 24,
  hero: 26,
  tile: 22,
  pill: 999
} as const;

export const Typography = {
  display: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
    lineHeight: 38,
    color: Harvest.text
  },
  heading: {
    fontSize: 26,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
    lineHeight: 32,
    color: Harvest.text
  },
  title: {
    fontSize: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
    lineHeight: 28,
    color: Harvest.text
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "500" as const,
    letterSpacing: 0,
    lineHeight: 24,
    color: Harvest.textSecondary
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    letterSpacing: 0.1,
    lineHeight: 22,
    color: Harvest.text
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: "500" as const,
    letterSpacing: 0.1,
    lineHeight: 22,
    color: Harvest.text
  },
  caption: {
    fontSize: 13,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
    lineHeight: 18,
    color: Harvest.textMuted
  },
  label: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    lineHeight: 16,
    color: Harvest.textMuted,
    textTransform: "uppercase" as const
  }
} satisfies Record<string, TextStyle>;

export const PremiumShadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0B3D28",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16
    },
    default: { elevation: 3 }
  }),
  hero: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#062818",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20
    },
    default: { elevation: 6 }
  }),
  float: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0B3D28",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 24
    },
    default: { elevation: 8 }
  })
} as const;

export const Motion = {
  fast: 200,
  normal: 280,
  slow: 350,
  /** Spring physics — Apple Health–style interactions */
  spring: { damping: 20, stiffness: 280, mass: 0.8 },
  springSoft: { damping: 22, stiffness: 220, mass: 0.9 },
  springSnappy: { damping: 18, stiffness: 320, mass: 0.7 }
} as const;

/** Consistent icon sizes across Today */
export const IconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  hero: 32
} as const;

/** Decorative opacity cap — never exceed 3% */
export const DecorOpacity = {
  max: 0.03,
  contour: 0.025,
  leaf: 0.028,
  radial: 0.03
} as const;
