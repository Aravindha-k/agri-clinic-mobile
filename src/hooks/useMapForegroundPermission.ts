import * as Location from "expo-location";
import { useEffect, useState } from "react";

export type MapForegroundPermission = {
  resolved: boolean;
  granted: boolean;
  denied: boolean;
  servicesEnabled: boolean;
};

const IDLE: MapForegroundPermission = {
  resolved: true,
  granted: false,
  denied: false,
  servicesEnabled: true
};

/**
 * Runtime foreground location permission — source of truth for MapLibre UserLocation.
 * Only polls when `enabled` (showLiveUserLocation) is true.
 */
export function useMapForegroundPermission(enabled: boolean): MapForegroundPermission {
  const [state, setState] = useState<MapForegroundPermission>(() =>
    enabled ? { ...IDLE, resolved: false } : IDLE
  );

  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, resolved: false }));

    void (async () => {
      try {
        const [servicesEnabled, permission] = await Promise.all([
          Location.hasServicesEnabledAsync(),
          Location.getForegroundPermissionsAsync()
        ]);
        if (cancelled) return;

        const granted = permission.status === "granted" && servicesEnabled;
        setState({
          resolved: true,
          granted,
          denied: permission.status === "denied",
          servicesEnabled
        });
      } catch {
        if (!cancelled) {
          setState({
            resolved: true,
            granted: false,
            denied: true,
            servicesEnabled: false
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
