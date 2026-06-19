/**
 * Premium forest dark theme — enterprise field-worker palette.
 * Use via `Colors` in mobile/lib/theme.ts and `forestCard()` helpers.
 */
import { Platform, type ViewStyle } from "react-native";

export const ForestDark = {
  bg: "#0A0F0B",
  surface: "#141B17",
  surfaceElevated: "#1A231D",
  primary: "#0F6A3D",
  primaryMuted: "#0C5532",
  accent: "#4AE28A",
  accentMuted: "rgba(74, 226, 138, 0.16)",
  textPrimary: "#FFFFFF",
  textSecondary: "#B7C5BC",
  textMuted: "#8A998F",
  textDim: "#6B7A71",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  routeLine: "#3BCF7A",
  routeGlow: "rgba(59, 207, 122, 0.28)",
  danger: "#E85D5D",
  dangerMuted: "rgba(232, 93, 93, 0.16)",
  warning: "#D4A017",
  warningMuted: "rgba(212, 160, 23, 0.14)"
} as const;

export const ForestGradient = {
  screen: ["#0A0F0B", "#0D1410", "#121A16"] as const,
  screenLocations: [0, 0.55, 1] as const,
  heroActive: ["#1A5C3A", "#0F6A3D", "#0A1510"] as const,
  heroActiveLocations: [0, 0.48, 1] as const,
  heroIdle: ["#1A231D", "#141B17"] as const,
  loginBackdrop: ["#0A0F0B", "#0E1612", "#141B17"] as const,
  loginBackdropLocations: [0, 0.45, 1] as const,
  primaryButton: ["#12804A", "#0F6A3D"] as const
} as const;

export const ForestRadius = {
  card: 16,
  cardLg: 18,
  button: 14,
  panel: 22
} as const;

export const forestShadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12
    },
    default: { elevation: 4 }
  }),
  hero: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 20
    },
    default: { elevation: 8 }
  }),
  panel: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.5,
      shadowRadius: 18
    },
    default: { elevation: 16 }
  })
} as const;

export type ForestCardVariant = "surface" | "elevated" | "inset";

/** Solid dark card — no blur, Android-friendly. */
export function forestCard(variant: ForestCardVariant = "surface"): ViewStyle {
  const bg =
    variant === "elevated"
      ? ForestDark.surfaceElevated
      : variant === "inset"
        ? "rgba(255,255,255,0.04)"
        : ForestDark.surface;

  return {
    backgroundColor: bg,
    borderColor: ForestDark.border,
    borderRadius: ForestRadius.card,
    borderWidth: 1,
    ...forestShadow.card
  };
}

/** Floating panel (tracking). */
export function forestPanel(): ViewStyle {
  return {
    backgroundColor: ForestDark.surfaceElevated,
    borderColor: ForestDark.borderStrong,
    borderRadius: ForestRadius.panel,
    borderWidth: 1,
    ...forestShadow.panel
  };
}

/** Login / form inset on dark surfaces. */
export function forestInset(): ViewStyle {
  return {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: ForestDark.border,
    borderRadius: 14,
    borderWidth: 1
  };
}
