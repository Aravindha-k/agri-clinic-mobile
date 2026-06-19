import { Dimensions } from "react-native";
import type { ImageContentPosition } from "expo-image";

/** Local bundled header hero images — no remote URLs. */
export const SCREEN_HEADER_IMAGES = {
  home: require("../assets/headers/home.jpg"),
  work: require("../assets/headers/work.jpg"),
  visit: require("../assets/headers/visit.jpg"),
  summary: require("../assets/headers/summary.jpg")
} as const;

/** ~30% of screen height — tall enough for logo + field photo on every tab. */
export function resolveScreenHeaderHeight(screenHeight = Dimensions.get("window").height) {
  return Math.round(Math.min(340, Math.max(240, screenHeight * 0.3)));
}

/** @deprecated Use resolveScreenHeaderHeight() */
export function resolveHeaderHeroHeight(screenHeight = Dimensions.get("window").height) {
  return resolveScreenHeaderHeight(screenHeight);
}

/** @deprecated Use resolveScreenHeaderHeight() */
export function resolveHomeHeaderHeroHeight(screenHeight = Dimensions.get("window").height) {
  return resolveScreenHeaderHeight(screenHeight);
}

/** @deprecated Use resolveScreenHeaderHeight() */
export const HEADER_HERO_HEIGHT = resolveScreenHeaderHeight();

export const HEADER_IMAGE_POSITION: Record<"home" | "work" | "visit" | "summary", ImageContentPosition> = {
  home: { left: "50%", top: "50%" },
  work: { left: "50%", top: "50%" },
  visit: { left: "50%", top: "50%" },
  summary: { left: "50%", top: "50%" }
};

/** Lighter fade — keep sharp field visible behind logo and titles. */
export const SCREEN_HEADER_OVERLAY = {
  colors: ["rgba(0,0,0,0.2)", "rgba(0,0,0,0.05)", "rgba(255,255,255,1)"],
  locations: [0, 0.82, 1]
};

/** @deprecated Use SCREEN_HEADER_OVERLAY */
export const HEADER_HOME_OVERLAY = SCREEN_HEADER_OVERLAY;

/** Mild overscan — avoid zooming into blurred edges. */
export const SCREEN_HEADER_IMAGE_BLEED = 1.04;

/** @deprecated Use SCREEN_HEADER_IMAGE_BLEED */
export const HEADER_HOME_IMAGE_BLEED = SCREEN_HEADER_IMAGE_BLEED;

/** @deprecated Use SCREEN_HEADER_OVERLAY */
export const HEADER_DEFAULT_OVERLAY = SCREEN_HEADER_OVERLAY;
