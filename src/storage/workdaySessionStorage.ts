import * as SecureStore from "expo-secure-store";

const WORKDAY_ID_KEY = "agri_active_workday_id";

export async function setActiveWorkdayId(workdayId: number | null): Promise<void> {
  if (workdayId == null) {
    await SecureStore.deleteItemAsync(WORKDAY_ID_KEY).catch(() => undefined);
    return;
  }
  await SecureStore.setItemAsync(WORKDAY_ID_KEY, String(workdayId));
}

export async function getActiveWorkdayId(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(WORKDAY_ID_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
