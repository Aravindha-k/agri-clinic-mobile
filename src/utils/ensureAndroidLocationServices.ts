import { Platform } from "react-native";
import * as Location from "expo-location";
import { readLocationServicesEnabled } from "./locationServicesProbe";

/**
 * Result of ensuring device location / GPS services are on.
 * Uses Android Play services SettingsClient via expo-location (in-app dialog).
 */
export type EnsureLocationServicesResult =
  | { status: "enabled" }
  | { status: "enabled_by_user" }
  | { status: "cancelled" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

let inFlight: Promise<EnsureLocationServicesResult> | null = null;

async function servicesEnabled(): Promise<boolean> {
  return readLocationServicesEnabled();
}

/**
 * Ensure device location services are enabled.
 *
 * Android: shows the system Location Settings resolution dialog
 * (`SettingsClient` / `ResolvableApiException`) via `Location.enableNetworkProviderAsync()`
 * — same class of UI as Maps / Swiggy / Zomato. Does not open full Settings by default.
 *
 * iOS / other: reports current state only (no Play Services resolution dialog).
 *
 * Safe to call from a single user gesture; concurrent calls share one in-flight promise.
 */
export async function ensureAndroidLocationServicesEnabled(): Promise<EnsureLocationServicesResult> {
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async (): Promise<EnsureLocationServicesResult> => {
    try {
      if (await servicesEnabled()) {
        return { status: "enabled" };
      }

      if (Platform.OS !== "android") {
        return { status: "unavailable" };
      }

      try {
        // Native Play Services dialog — resolves when user enables location, rejects on cancel.
        await Location.enableNetworkProviderAsync();
      } catch {
        if (await servicesEnabled()) {
          return { status: "enabled_by_user" };
        }
        return { status: "cancelled" };
      }

      if (await servicesEnabled()) {
        return { status: "enabled_by_user" };
      }

      // Dialog returned OK but providers still unavailable (OEM / Play Services edge cases).
      return { status: "unavailable" };
    } catch (err) {
      const message = err instanceof Error && err.message.trim() ? err.message : "location_services_error";
      return { status: "error", message };
    }
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
