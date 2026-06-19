import * as Battery from "expo-battery";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import {
  cancelWorkdayFieldReminders,
  initFieldReminderNotifications,
  presentBatteryLowReminder,
  syncWorkdayFieldReminders
} from "../notifications/fieldReminderNotifications";
import { useAppPreferences } from "../storage/AppPreferencesContext";
import { useTracking } from "../storage/TrackingContext";

const LOW_BATTERY_THRESHOLD = 0.2;
const BATTERY_RECHECK_MS = 5 * 60 * 1000;

/** Schedules field reminders while a workday is active; battery check is foreground-only. */
export function FieldReminderController() {
  const { isActive } = useTracking();
  const { reminderSoundsEnabled } = useAppPreferences();
  const reminderSoundsRef = useRef(reminderSoundsEnabled);
  const batteryAlertSentRef = useRef(false);
  const wasActiveRef = useRef(false);

  reminderSoundsRef.current = reminderSoundsEnabled;

  useEffect(() => {
    initFieldReminderNotifications();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    if (isActive) {
      void syncWorkdayFieldReminders(reminderSoundsEnabled);
      wasActiveRef.current = true;
      return;
    }

    if (wasActiveRef.current) {
      void cancelWorkdayFieldReminders();
      batteryAlertSentRef.current = false;
      wasActiveRef.current = false;
    }
  }, [isActive, reminderSoundsEnabled]);

  useEffect(() => {
    if (Platform.OS === "web" || !isActive) {
      batteryAlertSentRef.current = false;
      return;
    }

    let mounted = true;
    let batterySub: { remove: () => void } | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function evaluateBatteryLevel() {
      if (!mounted || !isActive) {
        return;
      }

      try {
        const level = await Battery.getBatteryLevelAsync();
        if (!mounted) {
          return;
        }

        if (level >= 0 && level < LOW_BATTERY_THRESHOLD) {
          if (!batteryAlertSentRef.current) {
            batteryAlertSentRef.current = true;
            await presentBatteryLowReminder(reminderSoundsRef.current);
          }
          return;
        }

        if (level >= LOW_BATTERY_THRESHOLD + 0.05) {
          batteryAlertSentRef.current = false;
        }
      } catch {
        /* battery API unavailable on this device */
      }
    }

    void evaluateBatteryLevel();

    if (typeof Battery.addBatteryLevelListener === "function") {
      batterySub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        if (batteryLevel >= 0 && batteryLevel < LOW_BATTERY_THRESHOLD) {
          if (!batteryAlertSentRef.current) {
            batteryAlertSentRef.current = true;
            void presentBatteryLowReminder(reminderSoundsRef.current);
          }
          return;
        }

        if (batteryLevel >= LOW_BATTERY_THRESHOLD + 0.05) {
          batteryAlertSentRef.current = false;
        }
      });
    }

    pollTimer = setInterval(() => {
      void evaluateBatteryLevel();
    }, BATTERY_RECHECK_MS);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void evaluateBatteryLevel();
      }
    });

    return () => {
      mounted = false;
      batterySub?.remove();
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      appStateSub.remove();
    };
  }, [isActive, reminderSoundsEnabled]);

  return null;
}
