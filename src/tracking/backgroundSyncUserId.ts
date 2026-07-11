import { getJson, setJson } from "../../mobile/lib/storage";

const BACKGROUND_USER_KEY = "background_sync_user_id_v1";

/** Persist active user id for background worker ownership checks. */
export function persistBackgroundSyncUserId(userId: number | null) {
  if (userId == null) return;
  setJson(BACKGROUND_USER_KEY, { userId, savedAt: new Date().toISOString() });
}

export function restoreBackgroundSyncUserId(): number | null {
  const row = getJson<{ userId?: number }>(BACKGROUND_USER_KEY, {});
  return row.userId ?? null;
}
