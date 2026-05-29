import { useCallback } from "react";
import { useTracking } from "../storage/TrackingContext";

/** Blocks actions that require an active workday (visits, tracking sync). */
export function useActiveWorkday() {
  const { isActive, requireActiveWorkday } = useTracking();

  const guardActiveWorkday = useCallback(() => requireActiveWorkday(), [requireActiveWorkday]);

  return { isActive, guardActiveWorkday, requireActiveWorkday };
}
