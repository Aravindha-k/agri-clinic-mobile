import { Dimensions } from "react-native";

/** Compact header height — no decorative photos. */
export function resolveScreenHeaderHeight(screenHeight = Dimensions.get("window").height) {
  return Math.round(Math.min(168, Math.max(120, screenHeight * 0.14)));
}

/** @deprecated Use resolveScreenHeaderHeight() */
export function resolveHeaderHeroHeight(screenHeight = Dimensions.get("window").height) {
  return resolveScreenHeaderHeight(screenHeight);
}

/** @deprecated Use resolveScreenHeaderHeight() */
export function resolveHomeHeaderHeroHeight(screenHeight = Dimensions.get("window").height) {
  return resolveScreenHeaderHeight(screenHeight);
}

/** @deprecated Decorative header images removed */
export const SCREEN_HEADER_IMAGES = {} as const;

/** @deprecated Decorative header images removed */
export const HEADER_IMAGE_POSITION = {} as const;

/** @deprecated Decorative header images removed */
export const SCREEN_HEADER_OVERLAY = {
  colors: ["transparent", "transparent"],
  locations: [0, 1]
} as const;

/** @deprecated Decorative header images removed */
export const SCREEN_HEADER_IMAGE_BLEED = 1;

/** @deprecated Use SCREEN_HEADER_OVERLAY */
export const HEADER_HOME_OVERLAY = SCREEN_HEADER_OVERLAY;

/** @deprecated Use SCREEN_HEADER_IMAGE_BLEED */
export const HEADER_HOME_IMAGE_BLEED = SCREEN_HEADER_IMAGE_BLEED;

/** @deprecated Use SCREEN_HEADER_OVERLAY */
export const HEADER_DEFAULT_OVERLAY = SCREEN_HEADER_OVERLAY;
