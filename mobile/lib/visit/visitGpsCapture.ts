/**
 * Visit GPS capture — reliable fix before Review / Submit.
 * Never requests OS permission here — Field Tracking Setup owns requests.
 */
import * as Location from "expo-location";
import { hasValidMapCoords } from "../../../src/utils/mapCoords";
import { readLocationServicesEnabled } from "../../../src/utils/locationServicesProbe";
import { checkForegroundPermission } from "../../../src/utils/location";

const FRESH_TIMEOUT_MS = 12_000;
const CACHED_MAX_AGE_MS = 90_000;
const MAX_ACCURACY_M = 150;

export type VisitGpsCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
  source: "fresh" | "cached";
};

export type VisitGpsCaptureResult =
  | { ok: true; coords: VisitGpsCoords }
  | {
      ok: false;
      reason: "permission_missing" | "services_disabled" | "timeout" | "invalid" | "unavailable";
      message: string;
    };

function logVisitGps(event: string, detail?: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.log(`[VisitGPS] ${event}`, detail ?? {});
}

function isValidFix(
  latitude: number,
  longitude: number,
  accuracy: number | null | undefined,
  timestamp: number,
  maxAgeMs: number
): boolean {
  if (!hasValidMapCoords(latitude, longitude)) return false;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  const age = Date.now() - timestamp;
  if (age < 0 || age > maxAgeMs) return false;
  if (accuracy != null && Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_M) return false;
  return true;
}

async function raceFreshFix(timeoutMs: number): Promise<Location.LocationObject | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: false
      }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      })
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Capture a field-visit GPS fix without requesting permission.
 * Prefer a fresh high-accuracy sample; allow a recent cached fix within policy.
 */
export async function captureVisitGps(_options?: {
  /** Ignored — capture never requests. Kept for call-site compatibility. */
  requestPermission?: boolean;
}): Promise<VisitGpsCaptureResult> {
  void _options;
  logVisitGps("capture_started");

  const servicesEnabled = await readLocationServicesEnabled().catch(() => false);
  if (!servicesEnabled) {
    logVisitGps("capture_blocked", { reason: "services_disabled" });
    return {
      ok: false,
      reason: "services_disabled",
      message: "Turn on phone location to record this visit."
    };
  }

  const permission = await checkForegroundPermission();
  if (!permission.granted) {
    logVisitGps("capture_blocked", { reason: "permission_missing" });
    return {
      ok: false,
      reason: "permission_missing",
      message: permission.message || "Location permission is required."
    };
  }

  const fresh = await raceFreshFix(FRESH_TIMEOUT_MS);
  if (fresh) {
    const { latitude, longitude, accuracy } = fresh.coords;
    if (isValidFix(latitude, longitude, accuracy, fresh.timestamp, FRESH_TIMEOUT_MS + 5_000)) {
      const coords: VisitGpsCoords = {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        capturedAt: new Date(fresh.timestamp).toISOString(),
        source: "fresh"
      };
      logVisitGps("capture_success", {
        accuracy: coords.accuracy,
        age: 0,
        source: "fresh"
      });
      return { ok: true, coords };
    }
  } else {
    logVisitGps("capture_timeout");
  }

  const cached = await Location.getLastKnownPositionAsync().catch(() => null);
  if (cached) {
    const { latitude, longitude, accuracy } = cached.coords;
    const age = Date.now() - cached.timestamp;
    if (isValidFix(latitude, longitude, accuracy, cached.timestamp, CACHED_MAX_AGE_MS)) {
      const coords: VisitGpsCoords = {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        capturedAt: new Date(cached.timestamp).toISOString(),
        source: "cached"
      };
      logVisitGps("cached_fix_used", { accuracy: coords.accuracy, age });
      return { ok: true, coords };
    }
  }

  // Distinguish timeout (fresh fix hung) from other unavailability.
  if (!fresh) {
    logVisitGps("capture_blocked", { reason: "timeout" });
    return {
      ok: false,
      reason: "timeout",
      message: "Couldn’t get your location. Move to an open area and try again."
    };
  }

  logVisitGps("capture_blocked", { reason: "unavailable" });
  return {
    ok: false,
    reason: "unavailable",
    message: "Couldn’t get location. Move to an open area and try again."
  };
}

export function visitGpsIsUsable(coords: {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
} | null): boolean {
  if (!coords) return false;
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);
  return hasValidMapCoords(lat, lng);
}
