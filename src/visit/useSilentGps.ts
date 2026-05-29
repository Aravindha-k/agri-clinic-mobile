import { useCallback, useEffect, useState } from "react";
import { getForegroundLocation, toVisitLocation } from "../utils/location";

type Options = {
  enabled?: boolean;
  /** When false, skip capture (e.g. GPS compliance block). */
  canCapture?: () => boolean;
};

export function useSilentGps(enabledOrOptions: boolean | Options = true) {
  const opts = typeof enabledOrOptions === "boolean" ? { enabled: enabledOrOptions } : enabledOrOptions;
  const enabled = opts.enabled ?? true;
  const canCapture = opts.canCapture ?? (() => true);
  const [latitude, setLatitude] = useState<string | undefined>();
  const [longitude, setLongitude] = useState<string | undefined>();
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  const capture = useCallback(async (): Promise<boolean> => {
    if (!canCapture()) {
      return false;
    }
    setCapturing(true);
    setError("");
    try {
      const result = await getForegroundLocation();
      if (!result.granted) {
        setError(result.message || "Location unavailable");
        return false;
      }
      const loc = toVisitLocation(result.location);
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to capture location");
      return false;
    } finally {
      setCapturing(false);
    }
  }, [canCapture]);

  useEffect(() => {
    if (enabled && canCapture()) {
      void capture();
    }
  }, [canCapture, enabled, capture]);

  return { latitude, longitude, capturing, error, capture, hasGps: Boolean(latitude && longitude) };
}
