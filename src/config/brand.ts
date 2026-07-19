import brandMeta from "./brand.config.js";

/** Official clinic palette — primary CTAs use #0F6B43; splash keeps cinematic gradient. */
export const BRAND_COLORS = {
  /** Enterprise primary green */
  primary: "#0F6B43",
  /** Dark Green (secondary) */
  secondary: "#0B5A38",
  /** White accent for text/icons on green surfaces */
  accent: "#FFFFFF",
  /** Soft green tint for chips/badges on light backgrounds */
  primarySoft: "#ECFDF5",
  /** Muted green border on soft surfaces */
  primarySoftBorder: "#B8D9C8",
  splash: brandMeta.splashBackgroundColor,
  gradientTop: "#0F5132",
  gradientMid: "#0F5132",
  gradientBottom: "#0B5A38",
  /** @deprecated Use `secondary` */
  gradientDeep: "#0B5A38"
} as const;

/**
 * Official company logo for ALL in-app branding (splash, login, headers, loaders).
 * Source of truth: assets/brand/logo_circle_transparent.png
 * Never use launcher assets (app_icon / adaptive foreground) in UI.
 */
export const BRAND = {
  ...brandMeta,
  /** @deprecated Use `companyName` */
  name: brandMeta.companyName,
  logo: require("../../assets/brand/logo_circle_transparent.png") as number
} as const;

/** Bundled module id for the canonical circular logo. Prefer `<CompanyLogo />` in UI. */
export const LOGO_IMAGE: number = BRAND.logo;

/** Relative path used by Expo splash plugin / app.config. */
export const CANONICAL_LOGO_ASSET = "./assets/brand/logo_circle_transparent.png";
