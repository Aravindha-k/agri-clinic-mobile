import { Dimensions } from "react-native";
import { BRAND_LOGO_FILL, BRAND_ORBIT_GAP_RATIO } from "../brand/brandHeaderSpacing";

/**
 * Responsive Today hero logo diameter (dp).
 * Tuned for 320–480px widths without overlapping Kavya text or the bell.
 */
export function todayHeroLogoSize(width?: number): number {
  const w = width ?? Dimensions.get("window").width;
  if (w < 360) return 88;
  if (w < 400) return 104;
  if (w < 430) return 116;
  return 128;
}

/**
 * Orbit service icon glyph size (dp) for the Today hero.
 */
export function todayOrbitIconSize(logoDiameter: number): number {
  if (logoDiameter < 100) return 24;
  if (logoDiameter < 116) return 28;
  return 32;
}

/** Full orbit revolution — slow enough to feel premium, fast enough to read as motion. */
export const TODAY_ORBIT_DURATION_MS = 10_000;

/** Cap logo column so wordmark + bell remain usable on narrow phones. */
export function todayHeroLogoColumnBudget(width?: number): number {
  const w = width ?? Dimensions.get("window").width;
  // Reserve ~44 bell + ~100 wordmark + padding inside the glass card.
  const reserve = w < 360 ? 140 : w < 400 ? 150 : 160;
  return Math.max(120, w - reserve);
}

export function todayHeroOrbitGapRatio(width?: number): number {
  const w = width ?? Dimensions.get("window").width;
  return w < 360 ? 0.14 : BRAND_ORBIT_GAP_RATIO;
}

export function measureTodayHeroStage(width?: number): { logo: number; stage: number; column: number } {
  const w = width ?? Dimensions.get("window").width;
  const logo = Math.round(todayHeroLogoSize(w) * BRAND_LOGO_FILL);
  const gapRatio = todayHeroOrbitGapRatio(w);
  const iconSize = todayOrbitIconSize(logo);
  const chipPad = 6;
  const chipSize = iconSize + chipPad * 2 + 2;
  const gap = logo * gapRatio;
  const stage = logo + chipSize * 2 + gap * 2 + 8;
  const budget = todayHeroLogoColumnBudget(w);
  return {
    logo,
    stage,
    column: Math.min(stage + 6, budget)
  };
}