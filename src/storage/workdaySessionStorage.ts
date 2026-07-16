import * as SecureStore from "expo-secure-store";
import { getLocalWorkDate, workDateFromIso } from "../utils/workdayCalendar";
import {
  legacyWorkdayMigrationDecision,
  workdayCacheKeyForUser,
  mergeWorkdayStartedAt
} from "../utils/workdayPersistence";
import { getActiveSyncUserId } from "../../mobile/lib/sync/queueOwnership";

export type WorkdaySessionStatus = "not_started" | "in_progress" | "completed";

/** One persisted work record per user per calendar day (local timezone). */
export type CachedWorkdayRecord = {
  workday_id: number;
  duty_session_id?: number;
  started_at: string;
  work_date: string;
  status: WorkdaySessionStatus;
  end_work_time?: string;
  total_work_duration_ms?: number;
  device_time_at_start?: string;
  server_time_at_start?: string;
  last_known_distance: number;
  last_known_points: number;
  user_id?: number;
};

/** @deprecated Use CachedWorkdayRecord — kept for GPS queue callers. */
export type CachedActiveWorkday = CachedWorkdayRecord;

const LEGACY_CACHE_KEY = "agri_active_workday_v1";
const LEGACY_ID_KEY = "agri_active_workday_id";
const LEGACY_STARTED_KEY = "agri_workday_started_at";
const LEGACY_OWNER_KEY = "agri_active_workday_owner_v1";

const LEGACY_KEYS = [
  LEGACY_CACHE_KEY,
  LEGACY_ID_KEY,
  LEGACY_STARTED_KEY,
  LEGACY_OWNER_KEY
] as const;

function cacheKeyForUser(userId: number | null | undefined): string {
  if (userId != null && Number.isFinite(userId) && userId > 0) {
    return workdayCacheKeyForUser(userId);
  }
  return LEGACY_CACHE_KEY;
}

async function readRawCache(key: string): Promise<CachedWorkdayRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    return parseCache(raw);
  } catch {
    return null;
  }
}

async function clearLegacyWorkdayKeys(): Promise<void> {
  await Promise.all(
    LEGACY_KEYS.map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined))
  );
}

function parseOwnerId(raw: string | null): number | null {
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeStatus(raw: unknown): WorkdaySessionStatus | null {
  if (raw === "in_progress" || raw === "working") return "in_progress";
  if (raw === "completed") return "completed";
  if (raw === "not_started") return "not_started";
  return null;
}

function parseCache(raw: string | null): CachedWorkdayRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedWorkdayRecord>;
    const status = normalizeStatus(parsed.status);
    if (!status || status === "not_started") return null;
    const workdayId = Number(parsed.workday_id);
    if (!Number.isFinite(workdayId) || workdayId <= 0) return null;
    if (typeof parsed.started_at !== "string" || !parsed.started_at.trim()) return null;
    const dutySessionId = Number(parsed.duty_session_id);
    const workDate =
      typeof parsed.work_date === "string" && parsed.work_date.trim()
        ? parsed.work_date.trim()
        : workDateFromIso(parsed.started_at) ?? getLocalWorkDate();
    return {
      workday_id: workdayId,
      duty_session_id:
        Number.isFinite(dutySessionId) && dutySessionId > 0 ? dutySessionId : undefined,
      started_at: parsed.started_at.trim(),
      work_date: workDate,
      status,
      end_work_time:
        typeof parsed.end_work_time === "string" && parsed.end_work_time.trim()
          ? parsed.end_work_time.trim()
          : undefined,
      total_work_duration_ms:
        typeof parsed.total_work_duration_ms === "number" &&
        Number.isFinite(parsed.total_work_duration_ms)
          ? Math.max(0, parsed.total_work_duration_ms)
          : undefined,
      device_time_at_start:
        typeof parsed.device_time_at_start === "string"
          ? parsed.device_time_at_start
          : undefined,
      server_time_at_start:
        typeof parsed.server_time_at_start === "string"
          ? parsed.server_time_at_start
          : undefined,
      last_known_distance: Number(parsed.last_known_distance) || 0,
      last_known_points: Number(parsed.last_known_points) || 0,
      user_id:
        typeof parsed.user_id === "number" && Number.isFinite(parsed.user_id)
          ? parsed.user_id
          : undefined
    };
  } catch {
    return null;
  }
}

export function isCachedWorkdayInProgress(record: CachedWorkdayRecord | null): boolean {
  return record?.status === "in_progress";
}

export function isCachedWorkdayCompleted(record: CachedWorkdayRecord | null): boolean {
  return record?.status === "completed";
}

export async function readCachedWorkdayRecord(): Promise<CachedWorkdayRecord | null> {
  return readCachedActiveWorkday();
}

export async function readCachedActiveWorkday(
  userId?: number | null
): Promise<CachedWorkdayRecord | null> {
  try {
    const resolvedUserId = userId === undefined ? getActiveSyncUserId() : userId;
    if (resolvedUserId != null && Number.isFinite(resolvedUserId) && resolvedUserId > 0) {
      const userRecord = await readRawCache(workdayCacheKeyForUser(resolvedUserId));
      if (userRecord) {
        if (userRecord.user_id == null) {
          // The scoped key itself proves ownership, including old scoped records
          // written before user_id was embedded in the JSON.
          const patched = { ...userRecord, user_id: resolvedUserId };
          await saveCachedActiveWorkday(patched);
          return patched;
        }
        if (userRecord.user_id === resolvedUserId) {
          return userRecord;
        }
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function readTodayWorkdayRecord(
  userId?: number | null
): Promise<CachedWorkdayRecord | null> {
  const cached = await readCachedActiveWorkday(userId);
  if (!cached) return null;
  if (cached.work_date !== getLocalWorkDate()) return null;
  if (userId != null && cached.user_id != null && cached.user_id !== userId) return null;
  return cached;
}

export async function saveCachedActiveWorkday(snapshot: CachedWorkdayRecord): Promise<void> {
  const key = cacheKeyForUser(snapshot.user_id ?? null);
  await SecureStore.setItemAsync(key, JSON.stringify(snapshot));
  if (snapshot.user_id != null) {
    await SecureStore.deleteItemAsync(LEGACY_CACHE_KEY).catch(() => undefined);
  }
}

export async function clearCachedActiveWorkday(userId?: number | null): Promise<void> {
  const keys = new Set<string>(LEGACY_KEYS);
  if (userId != null && Number.isFinite(userId)) {
    keys.add(workdayCacheKeyForUser(userId));
  }
  await Promise.all([...keys].map((key) => SecureStore.deleteItemAsync(key).catch(() => undefined)));
}

export async function clearObsoleteWorkdayAuthorityKeys(): Promise<void> {
  await clearLegacyWorkdayKeys();
}

export async function updateCachedWorkdayMetrics(
  distanceKm: number,
  routePoints: number,
  userId?: number | null
): Promise<void> {
  const cached = await readCachedActiveWorkday(userId);
  if (!cached || cached.status !== "in_progress") return;
  await saveCachedActiveWorkday({
    ...cached,
    last_known_distance: distanceKm,
    last_known_points: routePoints
  });
}

/** Used by location sync when posting GPS points. */
export async function getActiveWorkdayId(userId?: number | null): Promise<number | null> {
  const cached = await readCachedActiveWorkday(userId);
  if (!cached || cached.status !== "in_progress") return null;
  return cached.workday_id;
}

export async function getActiveDutySessionId(userId?: number | null): Promise<number | null> {
  const cached = await readCachedActiveWorkday(userId);
  if (!cached || cached.status !== "in_progress") return null;
  return cached.duty_session_id ?? null;
}

export async function saveDutySessionFromWorkday(
  workday: {
    workday_id: number;
    duty_session_id?: number;
    started_at?: string;
    start_time?: string;
  },
  options?: { userId?: number | null; serverTimeAtStart?: string | null }
): Promise<void> {
  const startedAt =
    typeof workday.started_at === "string" && workday.started_at.trim()
      ? workday.started_at.trim()
      : typeof workday.start_time === "string" && workday.start_time.trim()
        ? workday.start_time.trim()
        : new Date().toISOString();
  const dutySessionId =
    workday.duty_session_id != null &&
    Number.isFinite(workday.duty_session_id) &&
    workday.duty_session_id > 0
      ? workday.duty_session_id
      : undefined;
  const deviceNow = new Date().toISOString();
  const existing = await readCachedActiveWorkday(options?.userId ?? null);
  const persistedStart = mergeWorkdayStartedAt(existing?.started_at, startedAt) ?? startedAt;
  await saveCachedActiveWorkday({
    workday_id: workday.workday_id,
    duty_session_id: dutySessionId,
    started_at: persistedStart,
    work_date: getLocalWorkDate(),
    status: "in_progress",
    device_time_at_start: existing?.device_time_at_start ?? deviceNow,
    server_time_at_start: options?.serverTimeAtStart ?? persistedStart,
    last_known_distance: existing?.last_known_distance ?? 0,
    last_known_points: existing?.last_known_points ?? 0,
    user_id: options?.userId ?? existing?.user_id
  });
}

export async function markWorkdayCompletedInCache(
  options: {
    endWorkTime: string;
    totalDurationMs: number;
  },
  userId?: number | null
): Promise<void> {
  const cached = await readCachedActiveWorkday(userId);
  if (!cached) return;
  await saveCachedActiveWorkday({
    ...cached,
    status: "completed",
    end_work_time: options.endWorkTime,
    total_work_duration_ms: options.totalDurationMs
  });
}

export async function setActiveWorkdayId(workdayId: number | null): Promise<void> {
  if (workdayId == null) {
    return;
  }
  const existing = await readCachedActiveWorkday(null);
  if (existing) {
    await saveCachedActiveWorkday({ ...existing, workday_id: workdayId });
  }
}

export async function getWorkdayStartedAt(): Promise<string | null> {
  const cached = await readCachedActiveWorkday();
  return cached?.started_at ?? null;
}

export async function setWorkdayStartedAt(iso: string | null): Promise<void> {
  if (!iso) {
    return;
  }
  const existing = await readCachedActiveWorkday(null);
  if (existing) {
    await saveCachedActiveWorkday({ ...existing, started_at: iso });
  }
}
