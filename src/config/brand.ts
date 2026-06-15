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

export const BRAND = {
  ...brandMeta,
  /** @deprecated Use `companyName` */
  name: brandMeta.companyName,
  logo: require("../../assets/brand/logo.png") as number
} as const;

/** Set to null to use leaf fallback in logo components. */
export const LOGO_IMAGE: number | null = BRAND.logo;
