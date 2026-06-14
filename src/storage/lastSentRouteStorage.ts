import * as SecureStore from "expo-secure-store";
import type { RoutePoint } from "../tracking/shouldSendLocation";

const KEY = "agri_last_sent_route_point";

export async function getLastSentRoutePoint(): Promise<RoutePoint | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoutePoint;
    if (
      typeof parsed?.latitude !== "number" ||
      typeof parsed?.longitude !== "number" ||
      typeof parsed?.timestamp !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setLastSentRoutePoint(point: RoutePoint): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(point));
}

export async function clearLastSentRoutePoint(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
}
