/**
 * Strict day-map cache scoped by employee + Asia/Kolkata date + DutySession.
 * Presentation only — does not delete historical backend data.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DutyMapSummary } from "../types/duty";
import { dayMapCacheIdentity, toEmployeeDutyMapPresentation } from "../map/employeeDayMapMarkers";

const DAY_MAP_PREFIX = "agri_day_map_v1:";

function storageKey(userId: number, businessDate: string, dutySessionId: number | string): string {
  return `${DAY_MAP_PREFIX}${dayMapCacheIdentity({ userId, businessDate, dutySessionId })}`;
}

export async function readScopedDayMap(input: {
  userId: number;
  businessDate: string;
  dutySessionId: number | string;
}): Promise<DutyMapSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(
      storageKey(input.userId, input.businessDate, input.dutySessionId)
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DutyMapSummary;
    return toEmployeeDutyMapPresentation(parsed);
  } catch {
    return null;
  }
}

export async function writeScopedDayMap(input: {
  userId: number;
  businessDate: string;
  dutySessionId: number | string;
  dutyMap: DutyMapSummary | null;
}): Promise<void> {
  const key = storageKey(input.userId, input.businessDate, input.dutySessionId);
  try {
    if (!input.dutyMap) {
      await AsyncStorage.removeItem(key);
      return;
    }
    const presentation = toEmployeeDutyMapPresentation({
      ...input.dutyMap,
      dutyId:
        typeof input.dutySessionId === "number"
          ? input.dutySessionId
          : Number(input.dutySessionId) || input.dutyMap.dutyId
    });
    await AsyncStorage.setItem(key, JSON.stringify(presentation));
  } catch {
    // Cache is best-effort.
  }
}

/** Drop today's presentation map without wiping other session keys. */
export async function clearScopedDayMap(input: {
  userId: number;
  businessDate: string;
  dutySessionId: number | string;
}): Promise<void> {
  try {
    await AsyncStorage.removeItem(
      storageKey(input.userId, input.businessDate, input.dutySessionId)
    );
  } catch {
    // ignore
  }
}

export { dayMapCacheIdentity };
