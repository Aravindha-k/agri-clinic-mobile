import React, { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "./AuthContext";
import { useConnectivityOnline } from "../hooks/useConnectivityOnline";
import { runAutomaticSync, scheduleDebouncedAutomaticSync } from "../../mobile/lib/sync/automaticSyncCoordinator";
import { refreshSyncStoreCounts } from "../../mobile/lib/sync/offlineSyncManager";
import { persistBackgroundSyncUserId } from "../tracking/registerBackgroundFieldSyncTask";
import { registerPreSignOut } from "./preSignOut";
import {
  cancelBackgroundFieldSyncForUser,
  scheduleBackgroundFieldSync
} from "../../mobile/lib/sync/syncScheduler";
import { getFieldPendingCounts } from "../../mobile/lib/sync/pendingCounts";
import { useSyncStore } from "../../mobile/lib/store/syncStore";

/** Wires automatic sync triggers: auth restore, foreground, reconnect, startup. */
export function AutomaticSyncProvider({ children }: { children: React.ReactNode }) {
  const { isReady, isAuthenticated, employee, sessionValidating } = useAuth();
  const online = useConnectivityOnline();
  const authSyncStarted = useRef(false);
  const wasOffline = useRef(!online);

  useEffect(() => {
    if (employee?.id) {
      persistBackgroundSyncUserId(employee.id);
    }
  }, [employee?.id]);

  useEffect(() => {
    return registerPreSignOut(async () => {
      const userId = employee?.id;
      if (userId == null) return;
      const counts = getFieldPendingCounts();
      if (counts.total === 0) {
        await cancelBackgroundFieldSyncForUser(userId);
      }
    });
  }, [employee?.id]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      authSyncStarted.current = false;
      return;
    }
    if (sessionValidating) return;
    if (authSyncStarted.current) return;
    authSyncStarted.current = true;
    refreshSyncStoreCounts();
    void runAutomaticSync("authentication_restored");
    void scheduleBackgroundFieldSync();
  }, [isAuthenticated, isReady, sessionValidating]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    void runAutomaticSync("app_start");
  }, [isAuthenticated, isReady]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    const onAppState = (state: AppStateStatus) => {
      if (state === "active") {
        refreshSyncStoreCounts();
        void runAutomaticSync("app_foreground");
      }
    };

    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [isAuthenticated, isReady]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    const unsub = NetInfo.addEventListener((state) => {
      const nowOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (wasOffline.current && nowOnline) {
        scheduleDebouncedAutomaticSync("network_reconnected", 500);
      }
      wasOffline.current = !nowOnline;
      if (!nowOnline) {
        const counts = getFieldPendingCounts();
        if (counts.total > 0) {
          useSyncStore.getState().setSyncHealth("offline_saving");
        }
      }
    });

    return unsub;
  }, [isAuthenticated, isReady]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || online) return;
    const counts = getFieldPendingCounts();
    if (counts.total > 0) {
      useSyncStore.getState().setSyncHealth("offline_saving");
    }
  }, [isAuthenticated, isReady, online]);

  return <>{children}</>;
}
