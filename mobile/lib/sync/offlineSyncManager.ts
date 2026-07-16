import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import {
  pendingAttachmentLabel,
  uploadAllPendingAttachments,
  type PendingVisitAttachment
} from "../../../src/visit/pendingAttachments";
import type { VisitFormValues } from "../../../src/api/visits";
import { api, isNetworkError, unwrapApiData } from "../api";
import { flattenVisitPayloadForMultipart } from "../visitSubmitApi";
import { isDuplicateVisitResponse } from "../visitDuplicate";
import { prepareVisitForSubmit } from "../../../src/visit/prepareVisitSubmit";
import { validateVisitSubmitValues } from "../../../src/visit/visitValidation";
import { getJson, setJson, SYNC_STORAGE_KEYS } from "../storage";
import { useSyncStore } from "../store/syncStore";
import { GPS_QUEUE_MAX_POINTS } from "../../../src/tracking/trackingConfig";
import { flushPendingVisitEvidence } from "./pendingEvidenceQueue";
import type { PendingGPSPoint, PendingVisit, PendingVisitStatus } from "./fieldQueueTypes";
import { generateLocalSyncId } from "./queueIds";
import { appendGpsQueuePoint, ensureGpsPointIdentity, readActiveUserGpsQueue, writeFullGpsQueue } from "./gpsQueueStore";
import { getFieldPendingCounts, readActiveUserVisits } from "./pendingCounts";
import { getActiveSyncUserId } from "./queueOwnership";
import {
  runAutomaticSync,
  scheduleDebouncedAutomaticSync
} from "./automaticSyncCoordinator";
import { notifyFieldQueueChanged } from "./syncQueueNotifier";
import { getDeviceSessionId } from "../../../src/storage/deviceSessionStorage";

export type VisitSyncProgress = {
  index: number;
  total: number;
  farmerName: string;
  status: "syncing" | "success" | "failed";
  error?: string;
};

const VISIT_FLUSH_CONCURRENCY = 3;
const BATCH_DELAY_MS = 500;
const MAX_VISIT_ATTEMPTS = 3;
const GPS_FLUSH_THRESHOLD = 1;
const GPS_AUTO_FLUSH_DEBOUNCE_MS = 1500;
const GPS_BACKGROUND_FLUSH_INTERVAL_MS = 45_000;

const LEGACY_SECURE_VISIT_QUEUE_KEY = "agri_offline_visit_queue";

export type { PendingVisit, PendingVisitStatus, PendingGPSPoint } from "./fieldQueueTypes";
const LEGACY_VISITS_KEY = "pending_visits";
const LEGACY_GPS_KEY = "pending_gps_v1";

let netInfoUnsubscribe: (() => void) | null = null;
type SyncAllResult = {
  visits: { synced: number; failed: number };
  gps: { synced: number };
  evidence: { uploaded: number; remaining: number };
};

let syncAllInFlight: Promise<SyncAllResult> | null = null;
let gpsAutoFlushTimer: ReturnType<typeof setTimeout> | null = null;
let gpsBackgroundFlushTimer: ReturnType<typeof setInterval> | null = null;

type FailedVisitNotifier = (visit: PendingVisit) => void;
let notifyFailedVisit: FailedVisitNotifier = (visit) => {
  if (__DEV__) {
    console.warn("[offlineSync] visit failed permanently", visit.local_sync_id, visit.farmer_name);
  }
};

export function setFailedVisitNotifier(handler: FailedVisitNotifier) {
  notifyFailedVisit = handler;
}

function generateLocalSyncIdFallback() {
  return generateLocalSyncId();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readVisitQueue(): PendingVisit[] {
  return readActiveUserVisits();
}

function writeVisitQueue(queue: PendingVisit[]) {
  const userId = getActiveSyncUserId();
  const all = getJson<PendingVisit[]>(SYNC_STORAGE_KEYS.pendingVisits, []);
  if (userId == null) {
    setJson(SYNC_STORAGE_KEYS.pendingVisits, queue);
    return;
  }
  const foreign = all.filter((v) => v.user_id != null && v.user_id !== userId);
  setJson(SYNC_STORAGE_KEYS.pendingVisits, [...foreign, ...queue]);
}

function readGpsQueue(): PendingGPSPoint[] {
  return readActiveUserGpsQueue();
}

function writeGpsQueue(_queue: PendingGPSPoint[]) {
  /* GPS writes go through gpsQueueStore */
}

function countVisitStates(queue: PendingVisit[]) {
  const pending = queue.filter((v) => v.status === "pending" || v.status === "syncing").length;
  const failed = queue.filter(
    (v) => v.status === "failed" || v.status === "quarantined"
  ).length;
  return { pending, failed };
}

export function refreshSyncStoreCounts() {
  const counts = getFieldPendingCounts();
  useSyncStore.getState().setExtendedPending({
    visits: counts.visits,
    gps: counts.gps,
    photos: counts.photos,
    workdayOps: counts.workdayOps,
    failed: counts.permanentFailures
  });
}

async function isDeviceOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

function scheduleGpsAutoFlush() {
  if (gpsAutoFlushTimer) {
    clearTimeout(gpsAutoFlushTimer);
  }
  gpsAutoFlushTimer = setTimeout(() => {
    gpsAutoFlushTimer = null;
    void (async () => {
      if (!(await isDeviceOnline())) return;
      const pending = readGpsQueue().length;
      if (pending > 0) {
        await flushGPSQueue();
      }
    })();
  }, GPS_AUTO_FLUSH_DEBOUNCE_MS);
}

/** Flush queued route points when online — no employee action required. */
export async function autoFlushPendingGps(): Promise<{ synced: number }> {
  if (!(await isDeviceOnline())) {
    refreshSyncStoreCounts();
    return { synced: 0 };
  }
  return flushGPSQueue();
}

async function migrateLegacyQueues() {
  let currentVisits = readVisitQueue();
  if (!currentVisits.length) {
    try {
      const raw = await AsyncStorage.getItem(LEGACY_VISITS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{
          id?: string;
          local_sync_id?: string;
          createdAt?: string;
          values?: Record<string, unknown>;
          photos?: unknown[];
        }>;
        if (Array.isArray(parsed) && parsed.length) {
          currentVisits = parsed.map((row) => ({
            local_sync_id: row.local_sync_id || row.id || generateLocalSyncId(),
            payload: {
              ...(row.values ?? {}),
              __pending_attachments: row.photos ?? []
            } as Record<string, unknown>,
            created_at: row.createdAt || new Date().toISOString(),
            attempts: 0,
            status: "pending" as const,
            farmer_name: String(row.values?.farmer_name ?? "Farmer"),
            crop_name: String(row.values?.crop_name ?? "Crop")
          }));
          writeVisitQueue(currentVisits);
          await AsyncStorage.removeItem(LEGACY_VISITS_KEY);
        }
      }
    } catch {
      // ignore migration errors
    }
  }

  if (!currentVisits.length) {
    try {
      const secureRaw = await SecureStore.getItemAsync(LEGACY_SECURE_VISIT_QUEUE_KEY);
      if (secureRaw) {
        const parsed = JSON.parse(secureRaw) as Array<{
          id: string;
          values: Record<string, unknown>;
          pendingAttachments?: PendingVisitAttachment[];
          createdAt: string;
          attempts?: number;
        }>;
        if (Array.isArray(parsed) && parsed.length) {
          const migrated: PendingVisit[] = parsed.map((row) => ({
            local_sync_id: String(row.values.local_sync_id ?? row.id),
            payload: {
              ...row.values,
              __pending_attachments: row.pendingAttachments ?? []
            },
            created_at: row.createdAt,
            attempts: row.attempts ?? 0,
            status: "pending",
            farmer_name: String(row.values.farmer_name ?? "Farmer"),
            crop_name: String(row.values.crop_name ?? "Crop")
          }));
          writeVisitQueue(migrated);
          await SecureStore.deleteItemAsync(LEGACY_SECURE_VISIT_QUEUE_KEY);
        }
      }
    } catch {
      // ignore migration errors
    }
  }

  const gps = readGpsQueue();
  if (!gps.length) {
    const legacyGps = getJson<Array<Record<string, unknown>>>(LEGACY_GPS_KEY, []);
    if (legacyGps.length) {
      const migrated: PendingGPSPoint[] = legacyGps.map((row) =>
        ensureGpsPointIdentity({
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          accuracy: Number(row.accuracy ?? 0),
          speed: row.speed != null ? Number(row.speed) : null,
          heading: row.heading != null ? Number(row.heading) : null,
          battery_level: Number(row.battery_level ?? 0),
          recorded_at: String(row.recorded_at ?? row.captured_at ?? new Date().toISOString()),
          network_type: String(row.network_type ?? "unknown"),
          created_at: String(row.recorded_at ?? row.captured_at ?? new Date().toISOString())
        })
      );
      writeFullGpsQueue(migrated);
    }
  }
}

function buildVisitFormData(payload: Record<string, unknown>, localSyncId: string) {
  const formData = new FormData();
  const { __pending_attachments: _attachments, ...values } = payload;
  const flat = flattenVisitPayloadForMultipart(values as VisitFormValues, localSyncId);
  for (const [key, value] of Object.entries(flat)) {
    if (value !== "") formData.append(key, value);
  }
  return formData;
}

function resetStuckSyncingVisits() {
  const queue = readVisitQueue();
  let changed = false;
  const next = queue.map((row) => {
    if (row.status !== "syncing") return row;
    changed = true;
    return { ...row, status: "pending" as PendingVisitStatus };
  });
  if (changed) {
    writeVisitQueue(next);
  }
}

export async function addToVisitQueue(
  payload: Record<string, unknown> | FormData,
  farmer_name: string,
  crop_name: string,
  local_sync_id?: string
): Promise<string> {
  if (payload instanceof FormData) {
    const record: Record<string, unknown> = {};
    for (const [key, value] of (payload as unknown as { _parts?: [string, unknown][] })._parts ??
      []) {
      if (value != null) record[key] = value;
    }
    return addToVisitQueue(record, farmer_name, crop_name, local_sync_id);
  }

  await migrateLegacyQueues();
  const id = local_sync_id ?? generateLocalSyncId();
  const userId = getActiveSyncUserId();
  const deviceSessionId = await getDeviceSessionId();
  const now = new Date().toISOString();
  const queue = readVisitQueue();
  if (queue.some((row) => row.local_sync_id === id)) {
    refreshSyncStoreCounts();
    return id;
  }
  queue.push({
    local_sync_id: id,
    payload: { ...payload, local_sync_id: id },
    pending_photos: Array.isArray((payload as { pending_photos?: unknown }).pending_photos)
      ? ((payload as { pending_photos?: PendingVisit["pending_photos"] }).pending_photos ?? undefined)
      : undefined,
    created_at: now,
    updated_at: now,
    attempts: 0,
    status: "pending",
    farmer_name,
    crop_name,
    user_id: userId ?? undefined,
    device_session_id: deviceSessionId ?? undefined
  });
  writeVisitQueue(queue);
  refreshSyncStoreCounts();
  notifyFieldQueueChanged("visit_queued");
  return id;
}

export function removeVisitFromQueue(local_sync_id: string) {
  const next = readVisitQueue().filter((v) => v.local_sync_id !== local_sync_id);
  writeVisitQueue(next);
  refreshSyncStoreCounts();
  notifyFieldQueueChanged("periodic_foreground");
}

export function retryVisitFromQueue(local_sync_id: string): boolean {
  const queue = readVisitQueue();
  const index = queue.findIndex((visit) => visit.local_sync_id === local_sync_id);
  if (index < 0) return false;
  queue[index] = {
    ...queue[index],
    status: "pending",
    last_error: undefined,
    updated_at: new Date().toISOString()
  };
  writeVisitQueue(queue);
  refreshSyncStoreCounts();
  notifyFieldQueueChanged("periodic_foreground");
  return true;
}

export function addGPSPoint(point: PendingGPSPoint) {
  const userId = getActiveSyncUserId();
  appendGpsQueuePoint(
    ensureGpsPointIdentity({
      ...point,
      user_id: point.user_id ?? userId ?? undefined
    })
  );
  refreshSyncStoreCounts();
  scheduleDebouncedAutomaticSync("periodic_foreground", GPS_AUTO_FLUSH_DEBOUNCE_MS);
}

export function getPendingVisits(): PendingVisit[] {
  return readVisitQueue();
}

export async function flushVisitQueue(
  onProgress?: (progress: VisitSyncProgress) => void
): Promise<{ synced: number; failed: number }> {
  await migrateLegacyQueues();
  resetStuckSyncingVisits();
  const queue = readVisitQueue();
  const targets = queue.filter(
    (v) => v.status === "pending" || v.status === "failed" || v.status === "syncing"
  );
  if (!targets.length) {
    refreshSyncStoreCounts();
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  const total = targets.length;

  for (let offset = 0; offset < targets.length; offset += VISIT_FLUSH_CONCURRENCY) {
    const chunk = targets.slice(offset, offset + VISIT_FLUSH_CONCURRENCY);
    await Promise.all(
      chunk.map(async (visit, chunkIndex) => {
        const index = offset + chunkIndex;
        const queueNow = readVisitQueue();
        const rowIndex = queueNow.findIndex((v) => v.local_sync_id === visit.local_sync_id);
        if (rowIndex < 0) return;

        queueNow[rowIndex] = { ...queueNow[rowIndex], status: "syncing" };
        writeVisitQueue(queueNow);
        refreshSyncStoreCounts();
        onProgress?.({
          index,
          total,
          farmerName: visit.farmer_name,
          status: "syncing"
        });

        try {
          const prepared = await prepareVisitForSubmit(visit.payload as VisitFormValues);
          const validationError = validateVisitSubmitValues(prepared);
          if (validationError) {
            throw new Error(validationError);
          }
          const formData = buildVisitFormData(prepared, visit.local_sync_id);
          const response = await api.post("mobile/visits/", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          const body = unwrapApiData<Record<string, unknown>>(response.data);
          if (response.status === 200 || response.status === 201 || isDuplicateVisitResponse(body)) {
            const visitId = Number(body.id ?? body.visit_id);
            const pendingAttachments = (visit.payload as Record<string, unknown>)
              .__pending_attachments as PendingVisitAttachment[] | undefined;
            if (visitId > 0 && pendingAttachments?.length) {
              const { failed } = await uploadAllPendingAttachments(visitId, pendingAttachments);
              if (failed.length > 0) {
                // Visit is acknowledged — keep only failed media for retry, never recreate Visit.
                const failedSet = new Set(failed);
                const failedAttachments = pendingAttachments.filter((a) =>
                  failedSet.has(pendingAttachmentLabel(a))
                );
                if (failedAttachments.length) {
                  const { enqueueFailedVisitEvidence } = await import("./pendingEvidenceQueue");
                  await enqueueFailedVisitEvidence({
                    visitId,
                    attachments: failedAttachments,
                    localSyncId: visit.local_sync_id
                  });
                }
              }
            }
            const next = readVisitQueue().filter((v) => v.local_sync_id !== visit.local_sync_id);
            writeVisitQueue(next);
            synced += 1;
            onProgress?.({ index, total, farmerName: visit.farmer_name, status: "success" });
            return;
          }
          throw new Error("Unexpected visit sync response");
        } catch (err) {
          const next = readVisitQueue();
          const idx = next.findIndex((v) => v.local_sync_id === visit.local_sync_id);
          if (idx < 0) return;

          const attempts = next[idx].attempts + 1;
          if (isNetworkError(err)) {
            next[idx] = {
              ...next[idx],
              attempts,
              status: "pending",
              last_error: err instanceof Error ? err.message : "Network error",
              updated_at: new Date().toISOString()
            };
            writeVisitQueue(next);
            onProgress?.({
              index,
              total,
              farmerName: visit.farmer_name,
              status: "failed",
              error: err instanceof Error ? err.message : "Network error"
            });
            return;
          }

          if (attempts >= MAX_VISIT_ATTEMPTS) {
            next[idx] = {
              ...next[idx],
              attempts,
              status: "failed",
              last_error: err instanceof Error ? err.message : "Sync failed",
              updated_at: new Date().toISOString()
            };
            writeVisitQueue(next);
            failed += 1;
            notifyFailedVisit(next[idx]);
          } else {
            next[idx] = {
              ...next[idx],
              attempts,
              status: "pending",
              last_error: err instanceof Error ? err.message : "Sync failed",
              updated_at: new Date().toISOString()
            };
            writeVisitQueue(next);
          }
          onProgress?.({
            index,
            total,
            farmerName: visit.farmer_name,
            status: "failed",
            error: err instanceof Error ? err.message : "Sync failed"
          });
        } finally {
          refreshSyncStoreCounts();
        }
      })
    );

    if (offset + VISIT_FLUSH_CONCURRENCY < targets.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  refreshSyncStoreCounts();
  return { synced, failed };
}

export async function flushGPSQueue(): Promise<{ synced: number }> {
  const { flushOfflineLocationQueue } = await import("../../../src/tracking/locationSyncService");
  const synced = await flushOfflineLocationQueue();
  if (synced > 0) {
    setJson("last_gps_sync_v1", new Date().toISOString());
  }
  refreshSyncStoreCounts();
  return { synced };
}

export async function syncAll(): Promise<SyncAllResult> {
  const result = await runAutomaticSync("diagnostics_retry", { force: true });
  refreshSyncStoreCounts();
  return {
    visits: result.visits,
    gps: result.gps,
    evidence: result.evidence
  };
}

export function initOfflineSync() {
  if (netInfoUnsubscribe) return netInfoUnsubscribe;

  void migrateLegacyQueues().then(() => {
    resetStuckSyncingVisits();
    refreshSyncStoreCounts();
    void autoFlushPendingGps();
    void NetInfo.fetch().then((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (online) {
        void runAutomaticSync("app_start");
      }
    });
  });

  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (online) {
      scheduleDebouncedAutomaticSync("network_reconnected", 500);
    }
  });

  if (!gpsBackgroundFlushTimer) {
    gpsBackgroundFlushTimer = setInterval(() => {
      if (readGpsQueue().length > 0) {
        void autoFlushPendingGps();
      }
    }, GPS_BACKGROUND_FLUSH_INTERVAL_MS);
  }

  return () => {
    netInfoUnsubscribe?.();
    netInfoUnsubscribe = null;
    if (gpsBackgroundFlushTimer) {
      clearInterval(gpsBackgroundFlushTimer);
      gpsBackgroundFlushTimer = null;
    }
    if (gpsAutoFlushTimer) {
      clearTimeout(gpsAutoFlushTimer);
      gpsAutoFlushTimer = null;
    }
  };
}
