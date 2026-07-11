import { Alert } from "react-native";
import { getFieldPendingCounts, hasBlockingPendingFieldData } from "./pendingCounts";
import { runAutomaticSync } from "./automaticSyncCoordinator";

export type LogoutPendingCheckResult =
  | { allowed: true }
  | { allowed: false; reason: "pending_data"; counts: ReturnType<typeof getFieldPendingCounts> };

export function checkLogoutAllowed(): LogoutPendingCheckResult {
  if (!hasBlockingPendingFieldData()) {
    return { allowed: true };
  }
  return { allowed: false, reason: "pending_data", counts: getFieldPendingCounts() };
}

export async function trySyncBeforeLogout(): Promise<LogoutPendingCheckResult> {
  const before = getFieldPendingCounts();
  if (before.total === 0) {
    return { allowed: true };
  }
  await runAutomaticSync("diagnostics_retry");
  return checkLogoutAllowed();
}

export function showLogoutBlockedAlert(copy: {
  title: string;
  message: string;
  syncNow: string;
  staySignedIn: string;
  onSyncNow: () => void;
}) {
  Alert.alert(copy.title, copy.message, [
    { text: copy.staySignedIn, style: "cancel" },
    { text: copy.syncNow, onPress: copy.onSyncNow }
  ]);
}
