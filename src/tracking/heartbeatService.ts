/**
 * Canonical workday tracking heartbeat.
 * Keeps Admin Online while duty is active — independent of GPS movement.
 * Queues offline with stable client_heartbeat_id for idempotent replay.
 */
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { apiClient } from "../api/client";
import { getGpsStateReport, type GpsStateReport } from "../utils/gpsStateReport";
import { getJson, setJson, removeKey, SYNC_STORAGE_KEYS } from "../../mobile/lib/storage";
import { generateLocalHeartbeatId } from "../../mobile/lib/sync/queueIds";
import { assertTrackingAuthReady } from "./trackingAuthGate";
import { isDutyTrackingSessionActive, restoreDutySessionFromStorage } from "./trackingSession";
import { trackingDevLog } from "./trackingDevLog";

export type TrackingHeartbeatPayload = GpsStateReport & {
  client_heartbeat_id: string;
  app_state: string;
  network_available: boolean;
};

export type HeartbeatEmitResult = "sent" | "queued" | "skipped";

const HEARTBEAT_QUEUE_MAX = 40;

function readHeartbeatQueue(): TrackingHeartbeatPayload[] {
  const raw = getJson<TrackingHeartbeatPayload[]>(SYNC_STORAGE_KEYS.pendingHeartbeats, []);
  return Array.isArray(raw) ? raw : [];
}

function writeHeartbeatQueue(queue: TrackingHeartbeatPayload[]) {
  setJson(SYNC_STORAGE_KEYS.pendingHeartbeats, queue.slice(-HEARTBEAT_QUEUE_MAX));
}

export function clearHeartbeatQueue() {
  removeKey(SYNC_STORAGE_KEYS.pendingHeartbeats);
}

function enqueueHeartbeat(payload: TrackingHeartbeatPayload) {
  const queue = readHeartbeatQueue();
  if (queue.some((row) => row.client_heartbeat_id === payload.client_heartbeat_id)) {
    return;
  }
  queue.push(payload);
  writeHeartbeatQueue(queue);
  trackingDevLog("queued_offline", `heartbeat ${payload.client_heartbeat_id}`);
}

async function readNetworkAvailable(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return true;
  }
}

export async function buildTrackingHeartbeatPayload(options?: {
  gpsEnabledHint?: boolean;
  accuracy?: number | null;
  clientHeartbeatId?: string;
}): Promise<TrackingHeartbeatPayload> {
  const report = await getGpsStateReport(options);
  const network_available = await readNetworkAvailable();
  return {
    ...report,
    client_heartbeat_id: options?.clientHeartbeatId || generateLocalHeartbeatId(),
    app_state: String(AppState.currentState || "unknown"),
    network_available
  };
}

async function postHeartbeat(payload: TrackingHeartbeatPayload): Promise<void> {
  await apiClient("tracking/heartbeat/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/**
 * Emit one heartbeat while duty is active.
 * Always queues on network/auth failure — never invents coordinates.
 */
export async function emitTrackingHeartbeat(options?: {
  gpsEnabledHint?: boolean;
  accuracy?: number | null;
}): Promise<HeartbeatEmitResult> {
  const dutyActive =
    isDutyTrackingSessionActive() || (await restoreDutySessionFromStorage());
  if (!dutyActive) {
    return "skipped";
  }

  const payload = await buildTrackingHeartbeatPayload(options);
  const gate = await assertTrackingAuthReady("emitTrackingHeartbeat");
  if (!gate.ready) {
    enqueueHeartbeat(payload);
    return "queued";
  }

  try {
    await postHeartbeat(payload);
    trackingDevLog("tracking_heartbeat", payload.client_heartbeat_id);
    return "sent";
  } catch {
    enqueueHeartbeat(payload);
    return "queued";
  }
}

/** Flush queued heartbeats — single-flight; preserves client_heartbeat_id for dedupe. */
let heartbeatFlushInFlight: Promise<number> | null = null;

export async function flushHeartbeatQueue(): Promise<number> {
  if (heartbeatFlushInFlight) {
    return heartbeatFlushInFlight;
  }

  heartbeatFlushInFlight = (async () => {
    const gate = await assertTrackingAuthReady("flushHeartbeatQueue");
    if (!gate.ready) {
      return 0;
    }

    const queue = readHeartbeatQueue();
    if (!queue.length) {
      return 0;
    }

    const remaining: TrackingHeartbeatPayload[] = [];
    let sent = 0;
    for (const payload of queue) {
      try {
        await postHeartbeat(payload);
        sent += 1;
      } catch {
        remaining.push(payload);
      }
    }
    writeHeartbeatQueue(remaining);
    if (sent > 0) {
      trackingDevLog("tracking_queue_flush", `heartbeats_sent=${sent} remaining=${remaining.length}`);
    }
    return sent;
  })().finally(() => {
    heartbeatFlushInFlight = null;
  });

  return heartbeatFlushInFlight;
}

export function countPendingHeartbeats(): number {
  return readHeartbeatQueue().length;
}
