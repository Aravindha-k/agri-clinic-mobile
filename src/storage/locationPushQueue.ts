import * as SecureStore from "expo-secure-store";
import type { LocationPushPayload } from "../api/tracking";

const QUEUE_KEY = "agri_pending_location_push_v2";
const MAX_QUEUE_POINTS = 500;

function pointKey(payload: LocationPushPayload) {
  const t = payload.captured_at || payload.recorded_at || "";
  return `${t}:${payload.latitude}:${payload.longitude}`;
}

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
  const trimmed = items.slice(-MAX_QUEUE_POINTS);
  if (!trimmed.length) {
    await SecureStore.deleteItemAsync(QUEUE_KEY);
    return;
  }
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(trimmed));
}

export async function appendLocationPush(payload: LocationPushPayload) {
  const queue = await readLocationPushQueue();
  const key = pointKey(payload);
  const withoutDup = queue.filter((p) => pointKey(p) !== key);
  withoutDup.push(payload);
  await writeLocationPushQueue(withoutDup);
}

export async function enqueueLocationPush(payload: LocationPushPayload) {
  await appendLocationPush(payload);
}

export async function clearLocationPushQueue() {
  await SecureStore.deleteItemAsync(QUEUE_KEY);
}
