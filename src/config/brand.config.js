/** Shared brand metadata — imported by `app.config.js` and `brand.ts`. */
module.exports = {
  companyName: "Kavya Agri-Horti Clinic",
  brandShortName: "KAVYA",
  brandTitleLine1: "Kavya",
  brandTitleLine2: "Agri Clinic",
  platformSubtitle: "Smart Field Operations",
  appName: "Kavya Agri Clinic",
  launcherAppName: "Kavya Agri",
  splashTitle: "Kavya Agri Clinic",
  splashSubtitle: "Field Officer App",
  tagline: "Diagnostics • Solutions • Growth",
  portalSubtitle: "Field Officer App",
  loaderSubtitle: "Diagnostics • Solutions • Growth",
  employeeHint: "For field employees only",
  splashBackgroundColor: "#D8ECF8",
  /**
   * Android / Expo native launch screen — must match cinematic first frame
   * (light sky wash + circular logo). Never the old dark emerald / green-plate flash.
   */
  nativeSplashBackgroundColor: "#D8ECF8",
  /** Native + cinematic company logo — canonical circular transparent PNG. */
  splashImageAsset: "./assets/brand/logo_circle_transparent.png",
  /** Premium splash visible duration (ms) incl. crossfade. */
  splashDurationMs: 3820,
  /** Adaptive icon plate behind circular foreground — logo-matched dark green (not bright #0F6B43). */
  iconBackgroundColor: "#004D17",
  /** Official company logo for in-app UI (canonical circular transparent). */
  logoAsset: "./assets/brand/logo_circle_transparent.png",
  /** Expo / iOS / legacy launcher — circular logo inset on logo-matched dark green. */
  iconAsset: "./assets/brand/app_icon.png",
  /**
   * Android adaptive foreground — circular logo only (transparent, ~66% safe-zone inset).
   */
  adaptiveIconAsset: "./assets/brand/adaptive_icon_foreground.png",
  /** Launcher / in-app source: canonical circular transparent logo. */
  kacIconApproved: "./assets/brand/logo_circle_transparent.png",
  kacIconSolid: "./assets/brand/app_icon.png"
};
