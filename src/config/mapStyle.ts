import Constants from "expo-constants";

/** MapLibre demo tiles — suitable for local dev / internal QA only (not unlimited production traffic). */
export const MAPLIBRE_DEMO_STYLE_URL = "https://demotiles.maplibre.org/style.json";

export const MAP_UNAVAILABLE_MESSAGE =
  "Map is temporarily unavailable.\nYour route and visit data are still being recorded.";

export const MAP_STYLE_MISSING_MESSAGE =
  "Map configuration is unavailable in this build.";

export const MAP_TILES_OFFLINE_MESSAGE =
  "Map tiles are unavailable offline. Your GPS route and visits are still saved on this device.";

function trimOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

/**
 * Resolve the MapLibre style JSON URL for the current build.
 * Prefer explicit env vars; fall back to MapLibre demo tiles in development only.
 */
export function resolveMapStyleUrl(): string | null {
  const fromExtra = trimOrNull(Constants.expoConfig?.extra?.mapStyleUrl);
  if (fromExtra) return fromExtra;

  const env = trimOrNull(process.env.EXPO_PUBLIC_ENV);
  if (env === "production") {
    return trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL) ?? MAPLIBRE_DEMO_STYLE_URL;
  }
  if (env === "staging" || env === "preview") {
    return (
      trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL_STAGING) ??
      trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL)
    );
  }

  return (
    trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL_DEV) ??
    trimOrNull(process.env.EXPO_PUBLIC_MAP_STYLE_URL) ??
    (__DEV__ ? MAPLIBRE_DEMO_STYLE_URL : null)
  );
}

export function isMapStyleConfigured(): boolean {
  return Boolean(resolveMapStyleUrl());
}
