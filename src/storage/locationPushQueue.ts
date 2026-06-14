import type { LocationPushPayload } from "../api/tracking";
import {
  appendPendingGpsPoint,
  clearPendingGpsBuffer,
  migrateLegacyGpsQueueIfNeeded,
  PENDING_GPS_KEY,
  readPendingGpsBuffer
} from "../../mobile/lib/gps/trackingService";
import { appStorage } from "../../mobile/lib/mmkv";

export async function readLocationPushQueue(): Promise<LocationPushPayload[]> {
  await migrateLegacyGpsQueueIfNeeded();
  return readPendingGpsBuffer();
}

export async function writeLocationPushQueue(items: LocationPushPayload[]) {
  await migrateLegacyGpsQueueIfNeeded();
  appStorage.set(PENDING_GPS_KEY, JSON.stringify(items.slice(-200)));
}

export async function appendLocationPush(payload: LocationPushPayload) {
  await appendPendingGpsPoint(payload);
}

export async function enqueueLocationPush(payload: LocationPushPayload) {
  await appendLocationPush(payload);
}

export async function clearLocationPushQueue() {
  clearPendingGpsBuffer();
}
