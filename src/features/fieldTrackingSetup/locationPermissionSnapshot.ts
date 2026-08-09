/**
 * Shared silent location permission snapshot.
 * Never shows an OS dialog — use ensureForegroundLocation / ensureBackgroundLocation to REQUEST.
 */
import * as Location from "expo-location";
import { probeFieldTrackingPermissions } from "./probe";

export type LocationPermissionSnapshot = {
  foregroundGranted: boolean;
  preciseOk: boolean;
  backgroundGranted: boolean;
  servicesEnabled: boolean;
  readyForFieldWork: boolean;
};

/** Silent OS probe for all features (Today / Work Day / Visit / Map). */
export async function getLocationPermissionSnapshot(): Promise<LocationPermissionSnapshot> {
  const probe = await probeFieldTrackingPermissions();
  let servicesEnabled = true;
  try {
    servicesEnabled = await Location.hasServicesEnabledAsync();
  } catch {
    servicesEnabled = true;
  }
  return {
    foregroundGranted: probe.foregroundGranted,
    preciseOk: probe.preciseOk,
    backgroundGranted: probe.backgroundGranted,
    servicesEnabled,
    readyForFieldWork: probe.foregroundGranted && probe.preciseOk
  };
}
