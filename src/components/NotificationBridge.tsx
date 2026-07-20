import { useEffect, useRef } from "react";
import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";
import { TRACKING_HEALTH_COPY } from "../constants/trackingHealth";
import { useAuth } from "../storage/AuthContext";
import { useNotifications } from "../storage/NotificationsContext";
import { useOfflineSync } from "../storage/OfflineSyncContext";
import { useTrackingHealthOptional } from "../storage/TrackingHealthContext";
import { isTrackingHealthBlocking } from "../tracking/trackingHealthTypes";

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
  const trackingHealth = useTrackingHealthOptional();
  const { push } = useNotifications();
  const lastOutage = useRef<string | null>(null);
  const lastLoginNotice = useRef<string | null>(null);

  useEffect(() => {
    if (!loginNotice || loginNotice === lastLoginNotice.current) return;
    lastLoginNotice.current = loginNotice;
    if (loginNotice.includes("another device")) {
      push({ type: "session_replaced", title: "Signed out", message: SESSION_REPLACED_MESSAGE });
    } else if (loginNotice === SESSION_EXPIRED_MESSAGE || loginNotice.includes("Session expired")) {
      push({ type: "session_expired", title: "Session ended", message: SESSION_EXPIRED_MESSAGE });
    } else {
      push({ type: "info", title: "Account", message: loginNotice });
    }
  }, [loginNotice, push]);

  useEffect(() => {
    const health = trackingHealth?.health;
    if (!health) return;
    if (!isTrackingHealthBlocking(health)) {
      lastOutage.current = null;
      return;
    }
    if (lastOutage.current === health.status) return;
    lastOutage.current = health.status;
    push({
      type: "gps_off",
      title: TRACKING_HEALTH_COPY.notificationTitle,
      message: TRACKING_HEALTH_COPY.notificationBody
    });
  }, [push, trackingHealth?.health]);

  return <SyncFailReporter />;
}
