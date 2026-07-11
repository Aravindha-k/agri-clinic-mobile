import type { AutomaticSyncTrigger } from "./automaticSyncCoordinator";
import { scheduleBackgroundFieldSync } from "./syncScheduler";

/** Notify the automatic sync system that pending queue data changed. */
export function notifyFieldQueueChanged(trigger: AutomaticSyncTrigger): void {
  void scheduleBackgroundFieldSync();
  void import("./automaticSyncCoordinator").then((mod) => {
    mod.scheduleDebouncedAutomaticSync(trigger, 800);
  });
}
