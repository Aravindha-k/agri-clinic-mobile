import Constants from "expo-constants";
import { currentEnv, logMapStyleEvent } from "./mapStyleDiagnostics";

/** OpenFreeMap Liberty — street map for client QA / internal builds. */
export const MAPLIBRE_QA_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** MapLibre demo tiles — local dev fallback only (not for client QA APK). */
export const MAPLIBRE_DEMO_STYLE_URL = "https://demotiles.maplibre.org/style.json";

export const MAP_UNAVAILABLE_MESSAGE =
  "Map is temporarily unavailable.\nYour route and visit data are still being recorded.";

export const MAP_TILES_LOAD_FAILED_MESSAGE =
  "Map tiles could not load.\nYour route and visit data are still being recorded.";

export const MAP_STYLE_MISSING_MESSAGE =
  "Map configuration is unavailable in this build.";

export const MAP_TILES_OFFLINE_MESSAGE =
  "Map tiles are unavailable offline. Your GPS route and visits are still saved on this device.";

function trimOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function isDemoStyleUrl(url: string): boolean {
  return url.includes("demotiles.maplibre.org");
}

/**
 * Resolve the MapLibre style JSON URL for the current build.
 * Centralized — never hardcode inside map components.
 */
export function resolveMapStyleUrl(): string {
  const fromExtra = trimOrNull(Constants.expoConfig?.extra?.mapStyleUrl);
  if (fromExtra) {
    logMapStyleEvent("map_style_selected", fromExtra, { env: currentEnv() });
    return fromExtra;
  }

  const env = trimOrNull(process.env.EXPO_PUBLIC_ENV);
  if (env === "production") {
    const url = trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL) ?? MAPLIBRE_QA_STYLE_URL;
    logMapStyleEvent("map_style_selected", url, { env: "production" });
    return url;
  }
  if (env === "staging" || env === "preview") {
    const url =
      trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL_STAGING) ??
      trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL) ??
      MAPLIBRE_QA_STYLE_URL;
    logMapStyleEvent("map_style_selected", url, { env: env ?? "staging" });
    return url;
  }

  const url =
    trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL_DEV) ??
    trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL) ??
    (__DEV__ ? MAPLIBRE_DEMO_STYLE_URL : MAPLIBRE_QA_STYLE_URL);
  logMapStyleEvent("map_style_selected", url, { env: env ?? "development" });
  return url;
}

export function isMapStyleConfigured(): boolean {
  return Boolean(resolveMapStyleUrl());
}

export function isClientQaStyleUrl(url: string): boolean {
  return url.includes("openfreemap.org") || url.includes("tiles.openfreemap.org");
}

export { isDemoStyleUrl };
