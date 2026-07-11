import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import {
  cancelWorkdayFieldReminders,
  initFieldReminderNotifications,
  syncWorkdayFieldReminders
} from "../notifications/fieldReminderNotifications";
import { useAppPreferences } from "../storage/AppPreferencesContext";
import { useTracking } from "../storage/TrackingContext";

/** Schedules hourly hydration reminders while a workday is active. */
export function FieldReminderController() {
  const { isActive } = useTracking();
  const { reminderSoundsEnabled } = useAppPreferences();
  const wasActiveRef = useRef(false);

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
      wasActiveRef.current = false;
    }
  }, [isActive, reminderSoundsEnabled]);

  return null;
}
