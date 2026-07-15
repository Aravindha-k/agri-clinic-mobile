import type { AutomaticSyncTrigger } from "./automaticSyncCoordinator";
import { scheduleBackgroundFieldSync } from "./syncScheduler";

export type FieldQueueEvent = "queue_changed" | "sync_progress";
type FieldQueueListener = (event: FieldQueueEvent) => void;
const listeners = new Set<FieldQueueListener>();

export function subscribeFieldQueueChanges(listener: FieldQueueListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitFieldQueueChange(event: FieldQueueEvent): void {
  for (const listener of listeners) listener(event);
}

/** Notify the automatic sync system that pending queue data changed. */
export function notifyFieldQueueChanged(trigger: AutomaticSyncTrigger): void {
  emitFieldQueueChange("queue_changed");
  void scheduleBackgroundFieldSync();
  void import("./automaticSyncCoordinator").then((mod) => {
    mod.scheduleDebouncedAutomaticSync(trigger, 800);
  });
}
