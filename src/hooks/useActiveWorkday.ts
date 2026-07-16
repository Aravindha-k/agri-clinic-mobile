import { useCallback } from "react";
import { useDuty } from "../features/duty/store/DutyContext";

/** Blocks actions that require an active workday (visits, tracking sync). */
export function useActiveWorkday() {
  const { currentDuty } = useDuty();
  const isActive = Boolean(currentDuty?.is_active);

  const requireActiveWorkday = useCallback(() => isActive, [isActive]);

  const guardActiveWorkday = useCallback(() => requireActiveWorkday(), [requireActiveWorkday]);

  return { isActive, guardActiveWorkday, requireActiveWorkday };
}
