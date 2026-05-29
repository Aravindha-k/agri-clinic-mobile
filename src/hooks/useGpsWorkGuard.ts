import { useCallback } from "react";
import { useGpsCompliance } from "../storage/GpsComplianceContext";

/** Guard field-work actions (start day, visit, GPS capture, tracking sync). */
export function useGpsWorkGuard() {
  const { ensureWorkAllowed, isWorkBlocked, showPermissionHelp, status, availability } =
    useGpsCompliance();

  const guardWorkAction = useCallback(
    (run: () => void | Promise<void>, actionLabel?: string) => {
      if (!ensureWorkAllowed(actionLabel)) {
        return false;
      }
      void Promise.resolve(run()).catch(() => undefined);
      return true;
    },
    [ensureWorkAllowed]
  );

  const canRunWorkAction = useCallback(() => ensureWorkAllowed(), [ensureWorkAllowed]);

  return {
    guardWorkAction,
    canRunWorkAction,
    isWorkBlocked,
    status,
    availability,
    showPermissionHelp
  };
}
