import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Farmer } from "../../src/api/farmers";

export const RECENT_FARMERS_KEY = "recent_farmers";
const MAX_RECENT = 5;

export async function readRecentFarmers(): Promise<Farmer[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_FARMERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Farmer[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export async function pushRecentFarmer(farmer: Farmer): Promise<void> {
  const existing = await readRecentFarmers();
  const next = [farmer, ...existing.filter((row) => row.id !== farmer.id)].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_FARMERS_KEY, JSON.stringify(next));
}
