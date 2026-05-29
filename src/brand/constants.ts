export const BRAND = {
  appName: "Kavya Agri Clinic",
  name: "Kavya Agri Clinic",
  tagline: "Diagnostics • Solutions • Growth",
  loaderSubtitle: "Diagnostics • Solutions • Growth",
  employeeHint: "For field employees only"
} as const;

/** Shared greens for splash, login, and headers (must match `app.config.js` splash). */
export const BRAND_COLORS = {
  splash: "#0F5132",
  gradientTop: "#0F5132",
  gradientMid: "#157A4C",
  gradientBottom: "#1E9B5E",
  gradientDeep: "#0B5A38"
} as const;

/** Set to null to use leaf fallback in AppLogo. */
export const LOGO_IMAGE: number | null = require("../../assets/kavya-logo.png") as number;
