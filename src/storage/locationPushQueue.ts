import * as SecureStore from "expo-secure-store";
import type { LocationPushPayload } from "../api/tracking";

const QUEUE_KEY = "agri_pending_location_push_v1";

export async function readLocationPushQueue(): Promise<LocationPushPayload[]> {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocationPushPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeLocationPushQueue(items: LocationPushPayload[]) {
  if (!items.length) {
    await SecureStore.deleteItemAsync(QUEUE_KEY);
    return;
  }
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(items));
}

/** Keep only the latest point when queueing (reduces backlog). */
export async function enqueueLocationPush(payload: LocationPushPayload) {
  await writeLocationPushQueue([payload]);
}

export async function clearLocationPushQueue() {
  await SecureStore.deleteItemAsync(QUEUE_KEY);
}
