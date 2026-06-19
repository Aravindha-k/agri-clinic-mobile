/**
 * Nature-inspired theme — forest navigation aesthetic.
 * Use selectively on splash, login, tracking, and workday hero only.
 */
import { Platform, type ViewStyle } from "react-native";

/** @deprecated Use NaturePalette — kept for gradual migration */
export const FieldPalette = {
  dawnTop: "#EEF6EA",
  dawnMid: "#DCEBD6",
  dawnBottom: "#C8DFC0",
  canopy: "#1B5E3A",
  canopyDeep: "#0F4A2E",
  canopyHero: "#0F5132",
  glassFill: "rgba(255, 255, 255, 0.78)",
  glassFillStrong: "rgba(255, 255, 255, 0.9)",
  glassBorder: "rgba(255, 255, 255, 0.62)",
  glassBorderSubtle: "rgba(255, 255, 255, 0.38)",
  glassDarkFill: "rgba(8, 28, 18, 0.88)",
  glassDarkBorder: "rgba(255, 255, 255, 0.12)",
  textOnField: "#0F2E1E",
  textMutedOnField: "#3D5C4A",
  textOnDark: "#F2FAF5",
  textMutedOnDark: "rgba(242, 250, 245, 0.76)",
  tabBarFill: "rgba(255, 255, 255, 0.9)",
  tabBarBorder: "rgba(255, 255, 255, 0.55)"
} as const;

export const NaturePalette = {
  forestDeep: "#061810",
  forestMid: "#0C2818",
  forestCanopy: "#143D28",
  leafGreen: "#3D9B62",
  leafBright: "#6BC48A",
  routeGreen: "#4ADE80",
  routeGlow: "rgba(74, 222, 128, 0.35)",
  earthBrown: "#6B4E2E",
  earthWarm: "#8B6914",
  sunlight: "#F4E4B8",
  sunlightSoft: "rgba(244, 228, 184, 0.22)",
  overlayDark: "rgba(6, 20, 12, 0.72)",
  glassDark: "rgba(8, 28, 18, 0.9)",
  glassDarkBorder: "rgba(255, 255, 255, 0.14)",
  glassDarkMuted: "rgba(255, 255, 255, 0.08)",
  textOnDark: "#F4FAF6",
  textMutedOnDark: "rgba(244, 250, 246, 0.72)",
  textDimOnDark: "rgba(244, 250, 246, 0.5)",
  // Aliases for dashboard glass (non-nature screens)
  dawnTop: FieldPalette.dawnTop,
  dawnMid: FieldPalette.dawnMid,
  dawnBottom: FieldPalette.dawnBottom,
  glassFill: FieldPalette.glassFill,
  glassFillStrong: FieldPalette.glassFillStrong,
  glassBorder: FieldPalette.glassBorder,
  textOnField: FieldPalette.textOnField,
  textMutedOnField: FieldPalette.textMutedOnField,
  tabBarFill: FieldPalette.tabBarFill,
  tabBarBorder: FieldPalette.tabBarBorder
} as const;

export const FieldGradient = {
  screen: ["#EEF6EA", "#D9EBD2", "#C5DFBE"] as const,
  screenLocations: [0, 0.48, 1] as const,
  heroActive: ["#1F7A4F", "#0F5132", "#082818"] as const,
  heroActiveLocations: [0, 0.52, 1] as const,
  loginTop: ["#061810", "#0C2818", "#143D28"] as const,
  loginTopLocations: [0, 0.5, 1] as const,
  forestBackdrop: ["#061810", "#0E2E1C", "#1A4A30", "#0C2818"] as const,
  forestBackdropLocations: [0, 0.35, 0.7, 1] as const,
  sunlightBeam: ["rgba(244,228,184,0.18)", "rgba(244,228,184,0)", "rgba(244,228,184,0)"] as const
} as const;

export const FieldRadius = {
  glass: 18,
  hero: 20,
  chip: 10,
  panel: 24
} as const;

export const fieldShadow = {
  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0B3D24",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius: 12
    },
    default: {}
  }),
  hero: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#052818",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 18
    },
    default: { elevation: 6 }
  }),
  panel: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.22,
      shadowRadius: 16
    },
    default: { elevation: 12 }
  }),
  tabBar: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#0B3D24",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 10
    },
    default: { elevation: 8 }
  })
} as const;

export type FieldGlassVariant = "light" | "strong" | "dark";

export function fieldGlassCard(variant: FieldGlassVariant = "light"): ViewStyle {
  if (variant === "dark") {
    return {
      backgroundColor: NaturePalette.glassDark,
      borderColor: NaturePalette.glassDarkBorder,
      borderWidth: 1,
      borderRadius: FieldRadius.glass,
      ...fieldShadow.soft
    };
  }

  return {
    backgroundColor: variant === "strong" ? FieldPalette.glassFillStrong : FieldPalette.glassFill,
    borderColor: FieldPalette.glassBorder,
    borderWidth: 1,
    borderRadius: FieldRadius.glass,
    ...fieldShadow.soft
  };
}

/** Dark translucent panel for login + tracking overlays. */
export function natureDarkGlass(): ViewStyle {
  return {
    backgroundColor: NaturePalette.glassDark,
    borderColor: NaturePalette.glassDarkBorder,
    borderWidth: 1,
    borderRadius: FieldRadius.panel,
    ...fieldShadow.panel
  };
}

/** Inset field on dark surfaces (login inputs). */
export function natureDarkInset(): ViewStyle {
  return {
    backgroundColor: NaturePalette.glassDarkMuted,
    borderColor: NaturePalette.glassDarkBorder,
    borderRadius: 14,
    borderWidth: 1
  };
}
