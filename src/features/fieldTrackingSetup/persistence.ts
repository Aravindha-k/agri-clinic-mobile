import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FIELD_TRACKING_SETUP_VERSION,
  type FieldTrackingSetupRecord
} from "./types";

const STORAGE_KEY = `field_tracking_setup_v${FIELD_TRACKING_SETUP_VERSION}`;

const EMPTY: FieldTrackingSetupRecord = {
  schemaVersion: FIELD_TRACKING_SETUP_VERSION,
  completedAt: null,
  batteryGuidedCompleted: false,
  oemGuidedCompleted: false,
  lastCompletedVersion: null
};

function normalize(raw: string | null): FieldTrackingSetupRecord {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as Partial<FieldTrackingSetupRecord>;
    return {
      schemaVersion: FIELD_TRACKING_SETUP_VERSION,
      completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : null,
      batteryGuidedCompleted: Boolean(parsed.batteryGuidedCompleted),
      oemGuidedCompleted: Boolean(parsed.oemGuidedCompleted),
      lastCompletedVersion:
        typeof parsed.lastCompletedVersion === "number" ? parsed.lastCompletedVersion : null,
      foregroundGranted: parsed.foregroundGranted,
      preciseLocationConfirmed: parsed.preciseLocationConfirmed,
      backgroundGranted: parsed.backgroundGranted,
      notificationGranted: parsed.notificationGranted,
      batteryGuidanceCompleted: Boolean(parsed.batteryGuidanceCompleted ?? parsed.batteryGuidedCompleted),
      oemGuidanceCompleted: Boolean(parsed.oemGuidanceCompleted ?? parsed.oemGuidedCompleted),
      temporaryForegroundLikely: parsed.temporaryForegroundLikely,
      lastProbedAt: typeof parsed.lastProbedAt === "string" ? parsed.lastProbedAt : null
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Persist a snapshot after a silent probe. Never treats snapshot as authoritative alone. */
export async function syncFieldTrackingPermissionSnapshot(snapshot: {
  foregroundGranted: boolean;
  preciseLocationConfirmed: boolean;
  backgroundGranted: boolean;
  notificationGranted: boolean;
  temporaryForegroundLikely?: boolean;
}): Promise<void> {
  await writeFieldTrackingSetupRecord({
    foregroundGranted: snapshot.foregroundGranted,
    preciseLocationConfirmed: snapshot.preciseLocationConfirmed,
    backgroundGranted: snapshot.backgroundGranted,
    notificationGranted: snapshot.notificationGranted,
    temporaryForegroundLikely: snapshot.temporaryForegroundLikely,
    lastProbedAt: new Date().toISOString()
  });
}

export async function readFieldTrackingSetupRecord(): Promise<FieldTrackingSetupRecord> {
  try {
    return normalize(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return { ...EMPTY };
  }
}

export async function writeFieldTrackingSetupRecord(
  patch: Partial<FieldTrackingSetupRecord>
): Promise<FieldTrackingSetupRecord> {
  const current = await readFieldTrackingSetupRecord();
  const next: FieldTrackingSetupRecord = {
    ...current,
    ...patch,
    schemaVersion: FIELD_TRACKING_SETUP_VERSION
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function markFieldTrackingSetupCompleted(): Promise<void> {
  await writeFieldTrackingSetupRecord({
    completedAt: new Date().toISOString(),
    lastCompletedVersion: FIELD_TRACKING_SETUP_VERSION
  });
}

export async function markBatteryGuidedCompleted(): Promise<void> {
  await writeFieldTrackingSetupRecord({ batteryGuidedCompleted: true });
}

export async function markOemGuidedCompleted(): Promise<void> {
  await writeFieldTrackingSetupRecord({ oemGuidedCompleted: true });
}

/** Clear completion so Settings can re-run the flow (keeps guided acknowledgements). */
export async function clearFieldTrackingSetupCompletion(): Promise<void> {
  await writeFieldTrackingSetupRecord({
    completedAt: null,
    lastCompletedVersion: null
  });
}
