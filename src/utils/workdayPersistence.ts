import type { CachedWorkdayRecord, WorkdaySessionStatus } from "../storage/workdaySessionStorage";
import { getLocalWorkDate, isWorkDateToday } from "./workdayCalendar";
import { getWorkdayStartTimestamp } from "./workdayStartedAt";

/** Never move started_at forward on server merge — keep earliest valid local anchor. */
export function mergeWorkdayStartedAt(
  localStartedAt: string | null | undefined,
  serverStartedAt: string | null | undefined
): string | null {
  const localTs = getWorkdayStartTimestamp(localStartedAt);
  const serverTs = getWorkdayStartTimestamp(serverStartedAt);
  if (localTs != null && serverTs != null) {
    return localTs <= serverTs ? localStartedAt!.trim() : serverStartedAt!.trim();
  }
  if (localTs != null) return localStartedAt!.trim();
  if (serverTs != null) return serverStartedAt!.trim();
  return null;
}

export function shouldRestoreWorkdayRecord(
  record: CachedWorkdayRecord | null | undefined,
  userId: number | null | undefined,
  reference = new Date()
): boolean {
  if (!record) return false;
  if (!isWorkDateToday(record.work_date, reference)) return false;
  if (record.status !== "in_progress" && record.status !== "completed") return false;
  if (userId != null && record.user_id != null && record.user_id !== userId) return false;
  return true;
}

export function computeWorkdayElapsedMs(options: {
  status: WorkdaySessionStatus;
  startedAt: string | null;
  now: number;
  completedDurationMs?: number;
}): number {
  if (options.status === "completed") {
    return Math.max(0, options.completedDurationMs ?? 0);
  }
  if (options.status !== "in_progress" || !options.startedAt) {
    return 0;
  }
  const start = getWorkdayStartTimestamp(options.startedAt);
  if (start == null) return 0;
  return Math.max(0, options.now - start);
}

export function workdayCacheKeyForUser(userId: number): string {
  return `agri_workday_v1_u${userId}`;
}

export type LegacyWorkdayMigrationDecision = "migrate" | "reject" | "unscoped";

/**
 * Legacy records may only move into a user-scoped key when they already carry
 * that user's ownership. An unowned global record is ambiguous and must never
 * be claimed by whichever employee happens to sign in next.
 */
export function legacyWorkdayMigrationDecision(
  requestedUserId: number | null | undefined,
  storedOwnerId: number | null | undefined
): LegacyWorkdayMigrationDecision {
  if (requestedUserId == null) return "unscoped";
  return storedOwnerId === requestedUserId ? "migrate" : "reject";
}

export function isTodayWorkDate(reference = new Date()): string {
  return getLocalWorkDate(reference);
}
