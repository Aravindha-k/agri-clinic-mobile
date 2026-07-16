import { useMemo } from "react";
import type { WorkdayStatus } from "../../../api/tracking";
import type { DutySessionStatus } from "../types/duty";

export function deriveDutySessionStatus(currentDuty: WorkdayStatus | null): DutySessionStatus {
  if (!currentDuty) return "not_started";
  const status = String((currentDuty as Record<string, unknown>).status ?? "").toLowerCase();
  if (currentDuty.is_active) return "active";
  if (status === "auto_completed") return "auto_completed";
  if (currentDuty.ended_at || currentDuty.end_time || currentDuty.is_active === false) return "completed";
  return "not_started";
}

export function useDutyPresentation(currentDuty: WorkdayStatus | null) {
  return useMemo(() => {
    const sessionStatus = deriveDutySessionStatus(currentDuty);
    const startedAt = currentDuty?.start_time ?? currentDuty?.started_at ?? null;
    const endedAt =
      (currentDuty as Record<string, unknown> | null)?.ended_at ??
      (currentDuty as Record<string, unknown> | null)?.end_time ??
      null;
    return {
      sessionStatus,
      isActive: sessionStatus === "active",
      isCompleted: sessionStatus === "completed" || sessionStatus === "auto_completed",
      hasDuty: Boolean(currentDuty),
      startedAt: typeof startedAt === "string" ? startedAt : null,
      endedAt: typeof endedAt === "string" ? endedAt : null
    };
  }, [currentDuty]);
}
