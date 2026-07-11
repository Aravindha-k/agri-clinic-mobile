import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { parseFieldReminderKind, playFieldReminderSound, usesInAppReminderSounds } from "./playReminderSound";

export const FIELD_REMINDER_IDS = {
  water: "field-reminder-water"
} as const;

/** Bundled hydration chime — must match android/app/src/main/res/raw/hydration_chime.wav */
export const WATER_REMINDER_SOUND = "hydration_chime.wav";

/** v8 — channel bumped when bundled hydration chime asset changes. */
const CHANNEL_WATER = "field-reminders-water-v8";
const CHANNEL_SILENT = "field-reminders-silent-v6";

const WATER_INTERVAL_SEC = 60 * 60;
/** Pre-schedule water nudges across a 9h workday (every hour). */
const WATER_REMINDER_SLOTS = Math.floor((9 * 60 * 60) / WATER_INTERVAL_SEC);

let channelsReady = false;
let handlerReady = false;

export function initFieldReminderNotifications() {
  if (handlerReady || Platform.OS === "web") {
    return;
  }
  handlerReady = true;

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const kind = parseFieldReminderKind(notification.request.content.data?.fieldReminderKind);
      const soundsOn = notification.request.content.data?.reminderSounds === true;

      if (soundsOn && usesInAppReminderSounds() && kind === "water") {
        void playFieldReminderSound();
      }

      const suppressOsSound = soundsOn && usesInAppReminderSounds() && kind === "water";

      return {
        shouldShowAlert: true,
        shouldPlaySound: !suppressOsSound,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
      };
    }
  });
}

export async function ensureFieldReminderChannels(): Promise<void> {
  if (channelsReady || Platform.OS !== "android") {
    channelsReady = true;
    return;
  }

  await Notifications.setNotificationChannelAsync(CHANNEL_WATER, {
    name: "Hydration reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: WATER_REMINDER_SOUND,
    enableVibrate: true,
    vibrationPattern: [0, 100, 70, 100]
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_SILENT, {
    name: "Field reminders (silent)",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: false
  });

  channelsReady = true;
}

export async function ensureFieldReminderPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true
    }
  });

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

function reminderCopy(): { title: string; body: string } {
  return {
    title: "Hydration reminder",
    body: "It's been 1 hour — drink some water to stay refreshed in the field."
  };
}

function androidChannelId(soundsEnabled: boolean): string | undefined {
  if (Platform.OS !== "android") {
    return undefined;
  }
  if (!soundsEnabled) {
    return CHANNEL_SILENT;
  }
  if (usesInAppReminderSounds()) {
    return CHANNEL_SILENT;
  }
  return CHANNEL_WATER;
}

function buildContent(soundsEnabled: boolean): Notifications.NotificationContentInput {
  const copy = reminderCopy();
  const inAppSounds = usesInAppReminderSounds();
  const osCustomSound = soundsEnabled && !inAppSounds ? WATER_REMINDER_SOUND : false;

  return {
    title: copy.title,
    body: copy.body,
    data: {
      fieldReminderKind: "water",
      reminderSounds: soundsEnabled
    },
    sound: osCustomSound
  };
}

type SchedulableTrigger = Exclude<Notifications.NotificationTriggerInput, null>;

function withAndroidChannel<T extends SchedulableTrigger>(trigger: T, soundsEnabled: boolean): T {
  const channelId = androidChannelId(soundsEnabled);
  if (!channelId) {
    return trigger;
  }
  return { ...trigger, channelId };
}

function waterReminderIdentifier(slot: number): string {
  return `${FIELD_REMINDER_IDS.water}-${slot}`;
}

function isWaterReminderIdentifier(id: string): boolean {
  return id === FIELD_REMINDER_IDS.water || id.startsWith(`${FIELD_REMINDER_IDS.water}-`);
}

/** Legacy heat/battery ids — cleared when workday reminders resync. */
const LEGACY_REMINDER_IDS = ["field-reminder-heat", "field-reminder-battery"];

export async function scheduleWaterReminder(soundsEnabled: boolean): Promise<void> {
  for (let slot = 1; slot <= WATER_REMINDER_SLOTS; slot += 1) {
    await Notifications.scheduleNotificationAsync({
      identifier: waterReminderIdentifier(slot),
      content: buildContent(soundsEnabled),
      trigger: withAndroidChannel(
        {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: WATER_INTERVAL_SEC * slot,
          repeats: false
        },
        soundsEnabled
      )
    });
  }
}

export async function cancelWorkdayFieldReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (entry) => isWaterReminderIdentifier(entry.identifier) || LEGACY_REMINDER_IDS.includes(entry.identifier)
      )
      .map((entry) => Notifications.cancelScheduledNotificationAsync(entry.identifier))
  );
}

export async function syncWorkdayFieldReminders(soundsEnabled: boolean): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  initFieldReminderNotifications();
  await ensureFieldReminderChannels();

  const allowed = await ensureFieldReminderPermissions();
  if (!allowed) {
    return;
  }

  await cancelWorkdayFieldReminders();
  await scheduleWaterReminder(soundsEnabled);
}

const SOUND_TEST_ID = "field-reminder-sound-test";

export type ReminderSoundTestResult = "ok" | "denied" | "web";

/** Fire a sample hydration reminder — for Settings sound check. */
export async function scheduleReminderSoundTest(
  soundsEnabled: boolean,
  delaySeconds = 5
): Promise<ReminderSoundTestResult> {
  if (Platform.OS === "web") {
    return "web";
  }

  initFieldReminderNotifications();
  await ensureFieldReminderChannels();

  const allowed = await ensureFieldReminderPermissions();
  if (!allowed) {
    return "denied";
  }

  if (usesInAppReminderSounds()) {
    return "ok";
  }

  const testId = `${SOUND_TEST_ID}-water`;
  await Notifications.cancelScheduledNotificationAsync(testId);

  const copy = reminderCopy();
  await Notifications.scheduleNotificationAsync({
    identifier: testId,
    content: {
      ...buildContent(soundsEnabled),
      title: `[Test] ${copy.title}`,
      body: copy.body
    },
    trigger: withAndroidChannel(
      {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(3, delaySeconds),
        repeats: false
      },
      soundsEnabled
    )
  });

  return "ok";
}
