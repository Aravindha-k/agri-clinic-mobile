import { Platform } from "react-native";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { getJson, setJson } from "../storage";
import { getActiveSyncUserId } from "./queueOwnership";
import { getFieldPendingCounts } from "./pendingCounts";
import { recordSyncDiagnostic } from "./syncDiagnostics";

export const BACKGROUND_FIELD_SYNC_TASK = "KAVYA_FIELD_DATA_SYNC";

const SCHEDULER_STATE_KEY = "field_sync_scheduler_state_v1";

type SchedulerState = {
  registered: boolean;
  lastScheduledAt: string | null;
  userId: number | null;
  workerScheduled: boolean;
};

function readSchedulerState(): SchedulerState {
  return getJson<SchedulerState>(SCHEDULER_STATE_KEY, {
    registered: false,
    lastScheduledAt: null,
    userId: null,
    workerScheduled: false
  });
}

function writeSchedulerState(patch: Partial<SchedulerState>) {
  setJson(SCHEDULER_STATE_KEY, { ...readSchedulerState(), ...patch });
}

export function getBackgroundSchedulerStatus(): SchedulerState {
  return readSchedulerState();
}

async function ensureTaskRegistered(): Promise<boolean> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return false;
  }
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FIELD_SYNC_TASK);
    if (!registered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_FIELD_SYNC_TASK, {
        minimumInterval: 15
      });
      writeSchedulerState({ registered: true });
      recordSyncDiagnostic({ event: "automatic_sync_scheduled", trigger: "android_background_worker" });
    }
    return true;
  } catch {
    return false;
  }
}

/** Schedule OS background worker when pending field data exists. */
export async function scheduleBackgroundFieldSync(): Promise<void> {
  const counts = getFieldPendingCounts();
  if (counts.total <= 0) {
    await cancelBackgroundFieldSync();
    return;
  }

  const userId = getActiveSyncUserId();
  if (userId == null) {
    return;
  }

  const ok = await ensureTaskRegistered();
  if (!ok) {
    return;
  }

  writeSchedulerState({
    lastScheduledAt: new Date().toISOString(),
    userId,
    workerScheduled: true
  });
}

export async function cancelBackgroundFieldSync(): Promise<void> {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FIELD_SYNC_TASK);
    if (registered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_FIELD_SYNC_TASK);
    }
  } catch {
    // ignore unregister errors
  }
  writeSchedulerState({
    registered: false,
    workerScheduled: false,
    userId: null
  });
}

/** Called after logout when no pending data remains. */
export async function cancelBackgroundFieldSyncForUser(userId: number): Promise<void> {
  const state = readSchedulerState();
  if (state.userId === userId || state.userId == null) {
    await cancelBackgroundFieldSync();
  }
}
