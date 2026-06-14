import { apiPathFromNextUrl } from "../../src/utils/apiPath";
import { parsePaginatedList, type PaginatedList } from "../../src/utils/apiUnwrap";
import { api, unwrapApiData } from "./api";
import { useSyncStore } from "./store/syncStore";

export type NotificationType = "visit" | "follow_up" | "sync_fail" | "gps" | "system";

export type AppNotification = {
  id: number;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  reference_id: number | null;
  farmer_id: number | null;
  farmer_name: string | null;
  crop_name: string | null;
  created_at: string;
};

export type NotificationListPage = PaginatedList<AppNotification>;

let cachedBadgeCount = 0;
let badgeCacheAt = 0;

function normalizeType(raw: unknown): NotificationType {
  const value = String(raw ?? "system")
    .toLowerCase()
    .replace(/-/g, "_");
  if (value === "visit") return "visit";
  if (value === "follow_up" || value === "followup") return "follow_up";
  if (value === "sync_fail" || value === "sync_failed" || value === "upload_failed") return "sync_fail";
  if (value === "gps" || value === "gps_off") return "gps";
  return "system";
}

function pickNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickString(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

export function normalizeNotification(row: Record<string, unknown>): AppNotification | null {
  const id = pickNumber(row.id ?? row.pk);
  const message = pickString(row.message ?? row.body ?? row.title);
  if (id == null || !message) return null;

  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : row.data && typeof row.data === "object" && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : {};

  return {
    id,
    message,
    notification_type: normalizeType(row.notification_type ?? row.type),
    is_read: Boolean(row.is_read ?? row.read),
    reference_id: pickNumber(row.reference_id ?? row.visit_id ?? meta.visit_id ?? meta.reference_id),
    farmer_id: pickNumber(row.farmer_id ?? meta.farmer_id),
    farmer_name: pickString(row.farmer_name ?? meta.farmer_name),
    crop_name: pickString(row.crop_name ?? meta.crop_name),
    created_at: pickString(row.created_at ?? row.createdAt) ?? new Date().toISOString()
  };
}

function parseNotificationPage(payload: unknown): NotificationListPage {
  const page = parsePaginatedList<Record<string, unknown>>(payload);
  const results = page.results
    .map((row) => normalizeNotification(row))
    .filter((row): row is AppNotification => row != null);
  return { ...page, results };
}

export function setBadgeCountLocal(count: number) {
  cachedBadgeCount = Math.max(0, count);
  badgeCacheAt = Date.now();
  useSyncStore.getState().setUnreadNotifCount(cachedBadgeCount);
}

/** Unread notification count for header badge. Cached briefly unless `force` is true. */
export async function getBadgeCount(force = false): Promise<number> {
  if (!force && Date.now() - badgeCacheAt < 4_000) {
    return cachedBadgeCount;
  }

  try {
    const response = await api.get("notifications/unread-count/");
    const data = unwrapApiData<Record<string, unknown> | number>(response.data);
    let count = 0;
    if (typeof data === "number") {
      count = data;
    } else if (data && typeof data === "object") {
      count = Number(data.count ?? data.unread_count ?? data.unread ?? 0);
    }
    setBadgeCountLocal(count);
    return cachedBadgeCount;
  } catch {
    return cachedBadgeCount;
  }
}

export async function fetchNotificationsPage(options?: {
  page?: number;
  nextUrl?: string | null;
}): Promise<NotificationListPage> {
  let path = "notifications/";
  if (options?.nextUrl) {
    const nextPath = apiPathFromNextUrl(options.nextUrl);
    if (!nextPath) return { results: [], next: null, count: 0 };
    path = nextPath;
  } else if (options?.page && options.page > 1) {
    path = `notifications/?page=${options.page}`;
  }

  const response = await api.get(path);
  return parseNotificationPage(response.data);
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`notifications/${id}/read/`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("notifications/mark-all-read/");
  setBadgeCountLocal(0);
}
