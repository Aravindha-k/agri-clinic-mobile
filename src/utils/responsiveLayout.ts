import { PixelRatio, Platform } from "react-native";

/** Canonical phone width breakpoints (logical dp). */
export const BREAKPOINTS = {
  xs: 320,
  sm: 360,
  md: 400,
  lg: 430
} as const;

/** Content should not stretch endlessly on large phones. */
export const CONTENT_MAX_WIDTH = 480;

/** Floor height for Day / map fill layouts — never collapse to 0. */
export const MAP_FILL_MIN_HEIGHT = 220;

export type ResponsiveBucket = "xs" | "sm" | "md" | "lg";

export function responsiveBucket(width: number): ResponsiveBucket {
  if (width < BREAKPOINTS.sm) return "xs";
  if (width < BREAKPOINTS.md) return "sm";
  if (width < BREAKPOINTS.lg) return "md";
  return "lg";
}

export function isCompactHeight(height: number): boolean {
  return height < 700;
}

export function isNarrowWidth(width: number): boolean {
  return width < BREAKPOINTS.sm;
}

/** Page horizontal padding scales slightly with width — not a global UI scale. */
export function pageHorizontalPad(width: number): number {
  if (width < BREAKPOINTS.sm) return 12;
  if (width < BREAKPOINTS.md) return 16;
  return 20;
}

/**
 * Usable Day map floor after summary / chrome.
 * Keeps a non-zero map on short phones without swallowing the whole screen.
 */
export function dayMapMinHeight(windowHeight: number, options?: { compactSummary?: boolean }): number {
  const reserve = options?.compactSummary ? 220 : 280;
  const available = windowHeight - reserve;
  return Math.max(MAP_FILL_MIN_HEIGHT, Math.min(available, Math.round(windowHeight * 0.55)));
}

/** Cap form/card width on large phones while allowing full-bleed tab bars. */
export function contentMaxWidthStyle(width: number): { width: "100%"; maxWidth: number; alignSelf: "center" } {
  return {
    width: "100%",
    maxWidth: Math.min(CONTENT_MAX_WIDTH, width),
    alignSelf: "center"
  };
}

export function fontScaleBucket(fontScale: number): "default" | "large" | "xlarge" {
  if (fontScale >= 1.3) return "xlarge";
  if (fontScale >= 1.15) return "large";
  return "default";
}

export function pixelDensityLabel(): string {
  const ratio = PixelRatio.get();
  if (ratio >= 3.5) return "xxxhdpi+";
  if (ratio >= 3) return "xxhdpi";
  if (ratio >= 2) return "xhdpi";
  if (ratio >= 1.5) return "hdpi";
  return "mdpi";
}

export function isAndroid(): boolean {
  return Platform.OS === "android";
}
