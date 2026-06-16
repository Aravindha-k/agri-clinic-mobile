import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Alert, AppState, Linking, type AppStateStatus } from "react-native";
import {
  GPS_BLOCK_AFTER_MS,
  GPS_BLOCKED_MESSAGE,
  GPS_PERMISSION_MESSAGE,
  GPS_PROBE_INTERVAL_MS,
  GPS_REMINDER_INTERVAL_MS,
  GPS_REMINDER_MESSAGE
} from "../constants/gpsCompliance";
import { GpsAvailability, isGpsAvailable, probeGpsAvailability } from "../utils/gpsStatus";
import { readCachedActiveWorkday } from "./workdaySessionStorage";
import { useAuth } from "./AuthContext";

export type GpsComplianceStatus = "active" | "required" | "blocked";

type GpsComplianceContextValue = {
  availability: GpsAvailability;
  status: GpsComplianceStatus;
  permissionDenied: boolean;
  isWorkBlocked: boolean;
  bannerTitle: string;
  bannerSubtitle: string;
  refreshGpsStatus: () => Promise<void>;
  /** Call right after the user grants location (e.g. workday start) for instant UI update. */
  notifyGpsGranted: () => void;
  /** Returns false when work actions must not run (30+ min without GPS). */
  ensureWorkAllowed: (actionLabel?: string) => boolean;
  /** Shows permission settings guidance (does not block unless status is blocked). */
  showPermissionHelp: () => void;
};

const GpsComplianceContext = createContext<GpsComplianceContextValue | undefined>(undefined);

function promptOpenSettings() {
  Alert.alert("Location permission", GPS_PERMISSION_MESSAGE, [
    { text: "Not now", style: "cancel" },
    {
      text: "Open Settings",
      onPress: () => {
        void Linking.openSettings().catch(() => undefined);
      }
    }
  ]);
}

export function GpsComplianceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [availability, setAvailability] = useState<GpsAvailability>("permission_undetermined");
  const [status, setStatus] = useState<GpsComplianceStatus>("active");
  const offlineSinceRef = useRef<number | null>(null);
  const lastReminderAtRef = useRef<number>(0);
  const probingRef = useRef(false);

  const applyAvailability = useCallback((next: GpsAvailability) => {
    setAvailability(next);
    const now = Date.now();

    if (isGpsAvailable(next)) {
      offlineSinceRef.current = null;
      lastReminderAtRef.current = 0;
      setStatus("active");
      return;
    }

    if (!offlineSinceRef.current) {
      offlineSinceRef.current = now;
    }

    const offlineMs = now - (offlineSinceRef.current ?? now);
    if (offlineMs >= GPS_BLOCK_AFTER_MS) {
      setStatus("blocked");
      return;
    }

    setStatus("required");

    if (now - lastReminderAtRef.current >= GPS_REMINDER_INTERVAL_MS) {
      lastReminderAtRef.current = now;
      if (next === "permission_denied") {
        promptOpenSettings();
      } else {
        Alert.alert("GPS required", GPS_REMINDER_MESSAGE);
      }
    }
  }, []);

  const notifyGpsGranted = useCallback(() => {
    offlineSinceRef.current = null;
    lastReminderAtRef.current = 0;
    setAvailability("active");
    setStatus("active");
  }, []);

  const refreshGpsStatus = useCallback(async () => {
    if (!isAuthenticated || probingRef.current) {
      return;
    }

    const activeWorkday = await readCachedActiveWorkday();
    if (!activeWorkday) {
      offlineSinceRef.current = null;
      lastReminderAtRef.current = 0;
      setStatus("active");
      return;
    }

    probingRef.current = true;
    try {
      const next = await probeGpsAvailability();
      applyAvailability(next);
    } catch {
      applyAvailability("services_off");
    } finally {
      probingRef.current = false;
    }
  }, [applyAvailability, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      offlineSinceRef.current = null;
      lastReminderAtRef.current = 0;
      setAvailability("permission_undetermined");
      setStatus("active");
      return;
    }

    void refreshGpsStatus();
    const interval = setInterval(() => {
      void refreshGpsStatus();
    }, GPS_PROBE_INTERVAL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === "active") {
        void refreshGpsStatus();
      }
    };
    const sub = AppState.addEventListener("change", onAppState);

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isAuthenticated, refreshGpsStatus]);

  const permissionDenied =
    availability === "permission_denied" || availability === "permission_undetermined";

  const showPermissionHelp = useCallback(() => {
    promptOpenSettings();
  }, []);

  const ensureWorkAllowed = useCallback(
    (_actionLabel?: string) => {
      if (!isAuthenticated || status !== "blocked") {
        return true;
      }

      if (availability === "permission_denied") {
        Alert.alert("GPS blocked", GPS_BLOCKED_MESSAGE, [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings().catch(() => undefined) }
        ]);
      } else {
        Alert.alert("GPS blocked", GPS_BLOCKED_MESSAGE);
      }
      return false;
    },
    [availability, isAuthenticated, status]
  );

  const bannerCopy = useMemo(() => {
    if (status === "active") {
      return { title: "GPS Active", subtitle: "Location is on for tracking and visits." };
    }
    if (status === "blocked") {
      return {
        title: "GPS Blocked",
        subtitle: "Turn on GPS to start work, visits, and tracking sync."
      };
    }
    if (availability === "permission_denied") {
      return {
        title: "GPS Required",
        subtitle: "Allow location permission in Settings for field work."
      };
    }
    return {
      title: "GPS Required",
      subtitle: "Turn on device location to continue tracking and visits."
    };
  }, [availability, status]);

  const value = useMemo(
    () => ({
      availability,
      status,
      permissionDenied,
      isWorkBlocked: status === "blocked",
      bannerTitle: bannerCopy.title,
      bannerSubtitle: bannerCopy.subtitle,
      refreshGpsStatus,
      notifyGpsGranted,
      ensureWorkAllowed,
      showPermissionHelp
    }),
    [
      availability,
      bannerCopy.subtitle,
      bannerCopy.title,
      ensureWorkAllowed,
      notifyGpsGranted,
      permissionDenied,
      refreshGpsStatus,
      showPermissionHelp,
      status
    ]
  );

  return <GpsComplianceContext.Provider value={value}>{children}</GpsComplianceContext.Provider>;
}

export function useGpsCompliance() {
  const ctx = useContext(GpsComplianceContext);
  if (!ctx) {
    throw new Error("useGpsCompliance must be used inside GpsComplianceProvider");
  }
  return ctx;
}
