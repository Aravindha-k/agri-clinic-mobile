/** Production API (Render) — baked into EAS/APK builds via eas.json env. */
const PRODUCTION_API_BASE_URL = "https://agri-clinic-backend.onrender.com/api/v1/";

/**
 * Local backend for `npx expo start` only (__DEV__).
 * Set EXPO_PUBLIC_DEV_API_URL in .env.local (not committed) if needed.
 * Android emulator example: http://10.0.2.2:8000/api/v1/
 */
const LOCAL_DEV_API_BASE_URL = "http://10.0.2.2:8000/api/v1/";

function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return PRODUCTION_API_BASE_URL;
  }
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function resolveApiBaseUrl(): string {
  // EAS preview/production APK: EXPO_PUBLIC_API_URL is set at build time → Render
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return normalizeApiBaseUrl(fromEnv);
  }

  // Local testing (expo start) — LAN backend unless forced to cloud
  if (__DEV__) {
    const useCloud =
      process.env.EXPO_PUBLIC_USE_PRODUCTION_API === "1" ||
      process.env.EXPO_PUBLIC_USE_PRODUCTION_API === "true";
    if (useCloud) {
      return PRODUCTION_API_BASE_URL;
    }
    const devOverride = process.env.EXPO_PUBLIC_DEV_API_URL?.trim();
    return normalizeApiBaseUrl(devOverride || LOCAL_DEV_API_BASE_URL);
  }

  return PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** True when app talks to Render (APK / release builds). */
export const IS_PRODUCTION_API = API_BASE_URL.startsWith("https://agri-clinic-backend.onrender.com");

if (__DEV__) {
  console.log("[API] Using base URL:", API_BASE_URL);
}
