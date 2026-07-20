import { Dimensions } from "react-native";
import { TODAY_PAGE_PAD } from "../../lib/todayLayout";

/**
 * Today hero sizing — LOGO SIZE IS LOCKED.
 * Only orbit canvas / ring / icon path / column / padding / gap may adapt.
 */

/** Locked central logo diameters by breakpoint — never recalculated from orbit fit. */
export const TODAY_LOCKED_LOGO_XS = 102;
export const TODAY_LOCKED_LOGO_SM = 118;
export const TODAY_LOCKED_LOGO_MD = 128;
export const TODAY_LOCKED_LOGO_LG = 141;

/** Documentary ratio used when deriving preferred orbit from locked logo. */
export const TODAY_LOGO_ORBIT_RATIO = 0.64;

/** At max zoom, keep ≥10% of orbit diameter as total clear space. */
export const TODAY_ORBIT_SAFE_FILL_MAX = 0.9;

/** Default edge clear between chip outer edge and canvas boundary. */
export const TODAY_ORBIT_EDGE_PAD_DEFAULT = 5;
export const TODAY_ORBIT_EDGE_PAD_MIN = 4;

export const TODAY_ORBIT_CHIP_PAD_DEFAULT = 6;
export const TODAY_ORBIT_CHIP_PAD_MIN = 3;

const HEADER_PAD_H = 12;
const BELL_RESERVE = 36;

/** Locked logo — identical across layout fit passes. */
export function todayLockedLogoSize(width?: number): number {
  const w = width ?? Dimensions.get("window").width;
  if (w < 360) return TODAY_LOCKED_LOGO_XS;
  if (w < 400) return TODAY_LOCKED_LOGO_SM;
  if (w < 430) return TODAY_LOCKED_LOGO_MD;
  return TODAY_LOCKED_LOGO_LG;
}

/** Preferred ring so locked logo sits ~64% at rest. */
export function todayPreferredOrbitDiameter(width?: number): number {
  return Math.round(todayLockedLogoSize(width) / TODAY_LOGO_ORBIT_RATIO);
}

/** Minimum ring so logo × 1.25 stays inside 90% of orbit. */
export function todayMinOrbitForLockedLogo(logoSize: number): number {
  return Math.ceil((logoSize * TODAY_LOGO_BREATH_MAX) / TODAY_ORBIT_SAFE_FILL_MAX);
}

/** @deprecated */
export function todayPreferredLogoSize(width?: number): number {
  return todayLockedLogoSize(width);
}

/** @deprecated */
export function todayOrbitDiameter(width?: number): number {
  return measureTodayHeroStage(width).orbit;
}

/** Always returns the locked logo size. */
export function todayHeroLogoSize(width?: number): number {
  return todayLockedLogoSize(width);
}

export function todayLogoScaledSize(logoSize: number, scale: number): number {
  return logoSize * scale;
}

export function todayOrbitInnerSafeDiameter(orbitDiameter: number): number {
  return orbitDiameter * TODAY_ORBIT_SAFE_FILL_MAX;
}

export function todayLogoFitsOrbitAtMaxScale(orbitDiameter: number, logoSize: number): boolean {
  return todayLogoScaledSize(logoSize, TODAY_LOGO_BREATH_MAX) <= todayOrbitInnerSafeDiameter(orbitDiameter);
}

export function todayOrbitIconSize(orbitDiameter: number, compactChips = false): number {
  // Slightly larger glyphs for a clearer, more modern orbit band.
  if (compactChips) {
    if (orbitDiameter < 150) return 13;
    if (orbitDiameter < 180) return 15;
    return 17;
  }
  if (orbitDiameter < 140) return 14;
  if (orbitDiameter < 170) return 16;
  if (orbitDiameter < 200) return 18;
  return 20;
}

export const TODAY_ORBIT_CHIP_PAD = TODAY_ORBIT_CHIP_PAD_DEFAULT;
/** @deprecated alias — use TODAY_ORBIT_EDGE_PAD_DEFAULT */
export const TODAY_ORBIT_EDGE_PAD = TODAY_ORBIT_EDGE_PAD_DEFAULT;

export function todayOrbitChipSize(
  orbitDiameter: number,
  options?: { chipPad?: number; compactChips?: boolean }
): number {
  const pad = options?.chipPad ?? TODAY_ORBIT_CHIP_PAD_DEFAULT;
  return todayOrbitIconSize(orbitDiameter, options?.compactChips) + pad * 2 + 2;
}

export function todayOrbitCanvasSize(
  orbitDiameter: number,
  options?: { chipPad?: number; edgePad?: number; compactChips?: boolean }
): number {
  const edge = options?.edgePad ?? TODAY_ORBIT_EDGE_PAD_DEFAULT;
  return orbitDiameter + todayOrbitChipSize(orbitDiameter, options) + edge * 2;
}

export function todayHeroOrbitGapRatio(): number {
  return 0;
}

export const TODAY_ORBIT_DURATION_MS = 11_000;

/** Locked breathe — do not change. */
export const TODAY_LOGO_BREATH_MIN = 0.75;
export const TODAY_LOGO_BREATH_MAX = 1.25;
export const TODAY_LOGO_BREATH_HALF_MS = 1_600;

function wordmarkMinWidth(width: number): number {
  if (width < 360) return 88;
  if (width < 400) return 108;
  return 118;
}

export function todayBrandColumnGap(width?: number, tight = false): number {
  const w = width ?? Dimensions.get("window").width;
  if (tight) {
    if (w < 360) return 6;
    if (w < 400) return 8;
    if (w < 430) return 10;
    return 12;
  }
  if (w < 360) return 8;
  if (w < 400) return 10;
  if (w < 430) return 12;
  return 14;
}

export function todayOrbitLeftInset(width?: number, tight = false): number {
  const w = width ?? Dimensions.get("window").width;
  if (tight) {
    if (w < 360) return 6;
    if (w < 400) return 8;
    if (w < 430) return 10;
    return 12;
  }
  if (w < 360) return 8;
  if (w < 400) return 10;
  if (w < 430) return 12;
  return 14;
}

export function todayOrbitCanvasMax(
  width?: number,
  options?: { tight?: boolean; gap?: number; leftInset?: number }
): number {
  const w = width ?? Dimensions.get("window").width;
  const tight = options?.tight ?? false;
  const gap = options?.gap ?? todayBrandColumnGap(w, tight);
  const leftInset = options?.leftInset ?? todayOrbitLeftInset(w, tight);
  const available =
    w - TODAY_PAGE_PAD * 2 - HEADER_PAD_H - wordmarkMinWidth(w) - BELL_RESERVE - gap - leftInset;
  const softCap = w < 360 ? 160 : w < 400 ? 178 : w < 430 ? 194 : 208;
  return Math.max(120, Math.min(softCap, Math.floor(available)));
}

export function measureTodayHeroStage(width?: number): {
  logo: number;
  orbit: number;
  canvas: number;
  stage: number;
  column: number;
  gapRatio: number;
  chipSize: number;
  chipPad: number;
  edgePad: number;
  compactChips: boolean;
  maxScaledLogo: number;
  innerSafe: number;
  leftInset: number;
  columnGap: number;
} {
  const w = width ?? Dimensions.get("window").width;
  const logo = todayLockedLogoSize(w);
  const minOrbit = todayMinOrbitForLockedLogo(logo);
  const preferredOrbit = Math.max(todayPreferredOrbitDiameter(w), minOrbit);

  let tight = false;
  let compactChips = false;
  let chipPad = TODAY_ORBIT_CHIP_PAD_DEFAULT;
  let edgePad = TODAY_ORBIT_EDGE_PAD_DEFAULT;
  let leftInset = todayOrbitLeftInset(w, tight);
  let columnGap = todayBrandColumnGap(w, tight);
  let canvasMax = todayOrbitCanvasMax(w, { tight, gap: columnGap, leftInset });

  let orbit = preferredOrbit;
  let chipSize = todayOrbitChipSize(orbit, { chipPad, compactChips });
  let canvas = todayOrbitCanvasSize(orbit, { chipPad, edgePad, compactChips });

  // 1) Shrink ring only (never below min safe for locked logo).
  while (canvas > canvasMax && orbit > minOrbit) {
    orbit -= 2;
    chipSize = todayOrbitChipSize(orbit, { chipPad, compactChips });
    canvas = todayOrbitCanvasSize(orbit, { chipPad, edgePad, compactChips });
  }

  // 2) If still too wide: tighten padding / chips / gap / inset — logo unchanged.
  if (canvas > canvasMax) {
    tight = true;
    compactChips = true;
    chipPad = TODAY_ORBIT_CHIP_PAD_MIN;
    edgePad = TODAY_ORBIT_EDGE_PAD_MIN;
    leftInset = todayOrbitLeftInset(w, true);
    columnGap = todayBrandColumnGap(w, true);
    canvasMax = todayOrbitCanvasMax(w, { tight: true, gap: columnGap, leftInset });
    orbit = Math.max(minOrbit, Math.min(orbit, preferredOrbit));
    chipSize = todayOrbitChipSize(orbit, { chipPad, compactChips });
    canvas = todayOrbitCanvasSize(orbit, { chipPad, edgePad, compactChips });
    while (canvas > canvasMax && orbit > minOrbit) {
      orbit -= 2;
      chipSize = todayOrbitChipSize(orbit, { chipPad, compactChips });
      canvas = todayOrbitCanvasSize(orbit, { chipPad, edgePad, compactChips });
    }
  }

  // Guarantee min orbit for locked logo zoom clearance.
  if (orbit < minOrbit) {
    orbit = minOrbit;
    chipSize = todayOrbitChipSize(orbit, { chipPad, compactChips });
    canvas = todayOrbitCanvasSize(orbit, { chipPad, edgePad, compactChips });
  }

  const maxScaledLogo = todayLogoScaledSize(logo, TODAY_LOGO_BREATH_MAX);
  const innerSafe = todayOrbitInnerSafeDiameter(orbit);

  return {
    logo,
    orbit,
    canvas,
    stage: canvas,
    column: canvas,
    gapRatio: todayHeroOrbitGapRatio(),
    chipSize,
    chipPad,
    edgePad,
    compactChips,
    maxScaledLogo,
    innerSafe,
    leftInset,
    columnGap
  };
}

export function todayHeroLogoColumnWidth(width?: number): number {
  return measureTodayHeroStage(width).column;
}

export function todayChipFitsCanvas(
  orbit: number,
  canvas: number,
  chipSize: number,
  edgePad = TODAY_ORBIT_EDGE_PAD_DEFAULT
): boolean {
  const outer = orbit / 2 + chipSize / 2;
  return outer <= canvas / 2 - edgePad + 0.5;
}
