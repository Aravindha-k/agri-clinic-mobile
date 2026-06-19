import * as Location from "expo-location";
import { readCachedActiveWorkday } from "../storage/workdaySessionStorage";

/** Single active duty tracking session — prevents duplicate watchers/tasks. */
let dutySessionActive = false;
let backgroundWatcherRunning = false;
let foregroundPollActive = false;
let lastKnownMoving = false;

export function isDutyTrackingSessionActive() {
  return dutySessionActive;
}

/** Restore in-memory duty flag from SecureStore (required after app kill / headless task). */
export async function restoreDutySessionFromStorage(): Promise<boolean> {
  if (dutySessionActive) {
    return true;
  }
  const cached = await readCachedActiveWorkday();
  if (cached?.status === "working") {
    dutySessionActive = true;
    return true;
  }
  return false;
}

export function markDutyTrackingSessionActive(active: boolean) {
  dutySessionActive = active;
  if (!active) {
    backgroundWatcherRunning = false;
    foregroundPollActive = false;
    lastKnownMoving = false;
  }
}

export function canStartBackgroundWatcher() {
  return dutySessionActive && !backgroundWatcherRunning;
}

export function markBackgroundWatcherRunning(running: boolean) {
  backgroundWatcherRunning = running;
}

export function canStartForegroundPoll() {
  return dutySessionActive && !foregroundPollActive;
}

export function markForegroundPollActive(active: boolean) {
  foregroundPollActive = active;
}

export function setTrackingMotionState(moving: boolean) {
  lastKnownMoving = moving;
}

export function isTrackingMotionMoving() {
  return lastKnownMoving;
}

/** High accuracy while moving; balanced when stopped to save battery. */
export function getForegroundTrackingAccuracy() {
  return lastKnownMoving ? Location.Accuracy.High : Location.Accuracy.Balanced;
}

export function getBackgroundTrackingAccuracy() {
  return lastKnownMoving ? Location.Accuracy.High : Location.Accuracy.Balanced;
}
