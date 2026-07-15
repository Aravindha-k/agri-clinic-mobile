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
  /** Android / Expo native launch screen — solid emerald, no logo. */
  nativeSplashBackgroundColor: "#0B3D2E",
  /** Native + cinematic company logo (project-root logo.png via relative path). */
  splashImageAsset: "./logo.png",
  /** Premium splash visible duration (ms) incl. crossfade. */
  splashDurationMs: 3820,
  /** Adaptive icon plate behind inset foreground — must stay white. */
  iconBackgroundColor: "#FFFFFF",
  /** Official company logo for in-app UI (bundled relative path to root logo.png). */
  logoAsset: "./logo.png",
  /** Expo / iOS / legacy launcher — exact logo_icons.png plate. */
  iconAsset: "./assets/brand/app_icon.png",
  /**
   * Android adaptive foreground — launcher artwork only (from logo_icons.png safe-zone inset).
   */
  adaptiveIconAsset: "./assets/brand/adaptive_icon_foreground.png",
  /** Immutable launcher designer source; promoted via `npm run icons:generate`. */
  kacIconApproved: "./assets/brand/logo_icons.png",
  kacIconSolid: "./assets/brand/app_icon.png"
};
