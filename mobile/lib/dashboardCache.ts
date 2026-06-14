import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DashboardData } from "./types";

const CACHE_KEY = "mobile_dashboard_cache_v1";

export async function readDashboardCache(): Promise<DashboardData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardData;
  } catch {
    return null;
  }
}

export async function writeDashboardCache(data: DashboardData): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore cache write failures
  }
}
