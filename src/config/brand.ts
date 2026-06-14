import brandMeta from "./brand.config.js";

/** Official clinic palette — must match `app.config.js` splash and native colors. */
export const BRAND_COLORS = {
  /** Deep Clinic Green (primary) */
  primary: "#0F5132",
  /** Dark Green (secondary) */
  secondary: "#0B5A38",
  /** White accent for text/icons on green surfaces */
  accent: "#FFFFFF",
  splash: brandMeta.splashBackgroundColor,
  gradientTop: "#0F5132",
  gradientMid: "#0F5132",
  gradientBottom: "#157A4C",
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
