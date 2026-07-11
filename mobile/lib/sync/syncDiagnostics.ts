import { AppState } from "react-native";
import { getJson, setJson } from "../storage";
import type { AutomaticSyncTrigger } from "./automaticSyncCoordinator";

export type SyncDiagnosticEvent =
  | "automatic_sync_scheduled"
  | "automatic_sync_started"
  | "automatic_sync_skipped_no_network"
  | "automatic_sync_skipped_no_auth"
  | "automatic_sync_progress"
  | "automatic_sync_partial"
  | "automatic_sync_completed"
  | "automatic_sync_retry_scheduled"
  | "background_worker_started"
  | "background_worker_finished"
  | "background_worker_auth_required";

export type SyncDiagnosticEntry = {
  event: SyncDiagnosticEvent;
  timestamp: string;
  trigger?: AutomaticSyncTrigger;
  counts?: {
    visits?: number;
    photos?: number;
    gps?: number;
    workdayOps?: number;
  };
  errorCode?: string;
  durationMs?: number;
  appState?: string;
  workerResult?: string;
};

const DIAGNOSTIC_HISTORY_KEY = "sync_diagnostic_history_v1";
const MAX_DIAGNOSTIC_ENTRIES = 80;

export function recordSyncDiagnostic(entry: Omit<SyncDiagnosticEntry, "timestamp" | "appState">) {
  const row: SyncDiagnosticEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    appState: AppState.currentState
  };
  const history = getJson<SyncDiagnosticEntry[]>(DIAGNOSTIC_HISTORY_KEY, []);
  history.push(row);
  if (history.length > MAX_DIAGNOSTIC_ENTRIES) {
    history.splice(0, history.length - MAX_DIAGNOSTIC_ENTRIES);
  }
  setJson(DIAGNOSTIC_HISTORY_KEY, history);
  if (__DEV__) {
    console.log("[sync-diag]", row.event, row.trigger ?? "", row.errorCode ?? "", row.counts ?? "");
  }
}

export function readSyncDiagnosticHistory(): SyncDiagnosticEntry[] {
  return getJson<SyncDiagnosticEntry[]>(DIAGNOSTIC_HISTORY_KEY, []);
}

export function clearSyncDiagnosticHistory() {
  setJson(DIAGNOSTIC_HISTORY_KEY, []);
}
