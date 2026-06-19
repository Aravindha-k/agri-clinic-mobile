import * as SecureStore from "expo-secure-store";

export type CachedActiveWorkday = {
  workday_id: number;
  duty_session_id: number;
  started_at: string;
  status: "working";
  last_known_distance: number;
  last_known_points: number;
};

const CACHE_KEY = "agri_active_workday_v1";
const LEGACY_ID_KEY = "agri_active_workday_id";
const LEGACY_STARTED_KEY = "agri_workday_started_at";

function parseCache(raw: string | null): CachedActiveWorkday | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedActiveWorkday>;
    if (parsed.status !== "working") return null;
    const workdayId = Number(parsed.workday_id);
    if (!Number.isFinite(workdayId) || workdayId <= 0) return null;
    if (typeof parsed.started_at !== "string" || !parsed.started_at.trim()) return null;
    const dutySessionId = Number(parsed.duty_session_id ?? workdayId);
    return {
      workday_id: workdayId,
      duty_session_id:
        Number.isFinite(dutySessionId) && dutySessionId > 0 ? dutySessionId : workdayId,
      started_at: parsed.started_at.trim(),
      status: "working",
      last_known_distance: Number(parsed.last_known_distance) || 0,
      last_known_points: Number(parsed.last_known_points) || 0
    };
  } catch {
    return null;
  }
}

export async function readCachedActiveWorkday(): Promise<CachedActiveWorkday | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    const fromV1 = parseCache(raw);
    if (fromV1) return fromV1;

    const [idRaw, startedRaw] = await Promise.all([
      SecureStore.getItemAsync(LEGACY_ID_KEY),
      SecureStore.getItemAsync(LEGACY_STARTED_KEY)
    ]);
    const id = idRaw ? Number(idRaw) : NaN;
    if (!Number.isFinite(id) || id <= 0 || !startedRaw?.trim()) return null;

    const migrated: CachedActiveWorkday = {
      workday_id: id,
      duty_session_id: id,
      started_at: startedRaw.trim(),
      status: "working",
      last_known_distance: 0,
      last_known_points: 0
    };
    await saveCachedActiveWorkday(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export async function saveCachedActiveWorkday(snapshot: CachedActiveWorkday): Promise<void> {
  await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(snapshot));
  await SecureStore.setItemAsync(LEGACY_ID_KEY, String(snapshot.workday_id));
  await SecureStore.setItemAsync(LEGACY_STARTED_KEY, snapshot.started_at);
}

export async function clearCachedActiveWorkday(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(CACHE_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_ID_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_STARTED_KEY).catch(() => undefined)
  ]);
}

export async function updateCachedWorkdayMetrics(
  distanceKm: number,
  routePoints: number
): Promise<void> {
  const cached = await readCachedActiveWorkday();
  if (!cached) return;
  await saveCachedActiveWorkday({
    ...cached,
    last_known_distance: distanceKm,
    last_known_points: routePoints
  });
}

/** Used by location sync when posting GPS points. */
export async function getActiveWorkdayId(): Promise<number | null> {
  const cached = await readCachedActiveWorkday();
  return cached?.workday_id ?? null;
}

export async function getActiveDutySessionId(): Promise<number | null> {
  const cached = await readCachedActiveWorkday();
  return cached?.duty_session_id ?? cached?.workday_id ?? null;
}

export async function saveDutySessionFromWorkday(workday: {
  workday_id: number;
  duty_session_id?: number;
  started_at?: string;
  start_time?: string;
}): Promise<void> {
  const startedAt =
    typeof workday.started_at === "string" && workday.started_at.trim()
      ? workday.started_at.trim()
      : typeof workday.start_time === "string" && workday.start_time.trim()
        ? workday.start_time.trim()
        : new Date().toISOString();
  const dutySessionId = workday.duty_session_id ?? workday.workday_id;
  await saveCachedActiveWorkday({
    workday_id: workday.workday_id,
    duty_session_id: dutySessionId,
    started_at: startedAt,
    status: "working",
    last_known_distance: 0,
    last_known_points: 0
  });
}

export async function setActiveWorkdayId(workdayId: number | null): Promise<void> {
  if (workdayId == null) {
    await clearCachedActiveWorkday();
    return;
  }
  const existing = await readCachedActiveWorkday();
  if (existing) {
    await saveCachedActiveWorkday({ ...existing, workday_id: workdayId });
    return;
  }
  await SecureStore.setItemAsync(LEGACY_ID_KEY, String(workdayId));
}

export async function getWorkdayStartedAt(): Promise<string | null> {
  const cached = await readCachedActiveWorkday();
  return cached?.started_at ?? null;
}

export async function setWorkdayStartedAt(iso: string | null): Promise<void> {
  if (!iso) {
    return;
  }
  const existing = await readCachedActiveWorkday();
  if (existing) {
    await saveCachedActiveWorkday({ ...existing, started_at: iso });
    return;
  }
  await SecureStore.setItemAsync(LEGACY_STARTED_KEY, iso);
}
