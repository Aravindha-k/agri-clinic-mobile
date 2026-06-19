import { useEffect, useRef } from "react";
import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { useAuth } from "../storage/AuthContext";
import { useGpsCompliance } from "../storage/GpsComplianceContext";
import { useNotifications } from "../storage/NotificationsContext";
import { useOfflineSync } from "../storage/OfflineSyncContext";

function SyncFailReporter() {
  const { lastSyncFailed } = useOfflineSync();
  const { push } = useNotifications();
  const prev = useRef(0);
  useEffect(() => {
    if (lastSyncFailed > 0 && lastSyncFailed !== prev.current) {
      push({
        type: "sync_failed",
        title: "Sync incomplete",
        message: `${lastSyncFailed} visit${lastSyncFailed === 1 ? "" : "s"} could not sync. Open Offline sync to retry.`
      });
    }
    prev.current = lastSyncFailed;
  }, [lastSyncFailed, push]);
  return null;
}

/** Pushes in-app notifications from auth, GPS, tracking, and sync state. */
export function NotificationBridge() {
  const { loginNotice } = useAuth();
  const { status: gpsStatus } = useGpsCompliance();
  const { push } = useNotifications();
  const lastGps = useRef(gpsStatus);
  const lastLoginNotice = useRef<string | null>(null);

  useEffect(() => {
    if (!loginNotice || loginNotice === lastLoginNotice.current) return;
    lastLoginNotice.current = loginNotice;
    if (loginNotice.includes("another device")) {
      push({ type: "session_replaced", title: "Signed out", message: SESSION_REPLACED_MESSAGE });
    } else if (loginNotice.includes("Session expired") || loginNotice.includes("sign in")) {
      push({ type: "session_expired", title: "Session ended", message: SESSION_EXPIRED_MESSAGE });
    } else {
      push({ type: "info", title: "Account", message: loginNotice });
    }
  }, [loginNotice, push]);

  useEffect(() => {
    if (gpsStatus === lastGps.current) return;
    lastGps.current = gpsStatus;
    if (gpsStatus === "blocked") {
      push({
        type: "gps_off",
        title: "GPS required",
        message: "Location has been off for 30 minutes. Enable GPS to continue field work."
      });
    }
  }, [gpsStatus, push]);

  return <SyncFailReporter />;
}

