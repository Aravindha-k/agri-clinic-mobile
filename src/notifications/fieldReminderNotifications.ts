import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { parseFieldReminderKind, playFieldReminderSound, usesInAppReminderSounds } from "./playReminderSound";

export const FIELD_REMINDER_IDS = {
  water: "field-reminder-water",
  heat: "field-reminder-heat",
  battery: "field-reminder-battery"
} as const;

/** Bundled water reminder — must match android/app/src/main/res/raw/water_pour.wav */
export const WATER_REMINDER_SOUND = "water_pour.wav";

/** Bundled heat reminder — must match android/app/src/main/res/raw/heat.wav */
export const HEAT_REMINDER_SOUND = "heat.wav";

/** v6 — channel bumped when bundled water_pour.wav asset changes. */
const CHANNEL_WATER = "field-reminders-water-v6";
const CHANNEL_HEAT = "field-reminders-heat-v7";
const CHANNEL_BATTERY = "field-reminders-battery-v6";
const CHANNEL_SILENT = "field-reminders-silent-v6";

const WATER_INTERVAL_SEC = 30 * 60;
/** Pre-schedule water nudges across a 9h workday (every 30 min). */
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

      if (soundsOn && usesInAppReminderSounds() && (kind === "water" || kind === "heat")) {
        void playFieldReminderSound(kind);
      }

      const suppressOsSound = soundsOn && usesInAppReminderSounds() && kind !== "battery";

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

  // One channel per sound — Android cannot change sound on an existing channel.
  await Notifications.setNotificationChannelAsync(CHANNEL_WATER, {
    name: "Water reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: WATER_REMINDER_SOUND,
    enableVibrate: true,
    vibrationPattern: [0, 120, 80, 120]
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_HEAT, {
    name: "Heat reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: HEAT_REMINDER_SOUND,
    enableVibrate: true,
    vibrationPattern: [0, 140, 90, 140]
  });

  await Notifications.setNotificationChannelAsync(CHANNEL_BATTERY, {
    name: "Battery reminders",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default"
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

type ReminderKind = "water" | "heat" | "battery";

function reminderCopy(kind: ReminderKind): { title: string; body: string } {
  switch (kind) {
    case "water":
      return {
        title: "stay hydrated",
        body: "it's been 30 minutes — drink some water"
      };
    case "heat":
      return {
        title: "heat advisory",
        body: "temperatures are high — consider resting in shade before your next visit"
      };
    case "battery":
      return {
        title: "battery low",
        body: "battery may run out — gps tracking could stop if your phone powers off"
      };
  }
}

function reminderSound(kind: ReminderKind, soundsEnabled: boolean): string | boolean {
  if (!soundsEnabled) {
    return false;
  }
  if (kind === "water") {
    return WATER_REMINDER_SOUND;
  }
  if (kind === "heat") {
    return HEAT_REMINDER_SOUND;
  }
  return "default";
}

function androidChannelId(kind: ReminderKind, soundsEnabled: boolean): string | undefined {
  if (Platform.OS !== "android") {
    return undefined;
  }
  if (!soundsEnabled) {
    return CHANNEL_SILENT;
  }
  // Expo Go cannot load custom wav on the channel — use silent channel + in-app audio only.
  if (usesInAppReminderSounds() && (kind === "water" || kind === "heat")) {
    return CHANNEL_SILENT;
  }
  if (kind === "water") {
    return CHANNEL_WATER;
  }
  if (kind === "heat") {
    return CHANNEL_HEAT;
  }
  return CHANNEL_BATTERY;
}

function buildContent(kind: ReminderKind, soundsEnabled: boolean): Notifications.NotificationContentInput {
  const copy = reminderCopy(kind);
  const inAppSounds = usesInAppReminderSounds();
  const osCustomSound =
    soundsEnabled && !inAppSounds ? reminderSound(kind, true) : soundsEnabled && kind === "battery" ? "default" : false;

  return {
    title: copy.title,
    body: copy.body,
    data: {
      fieldReminderKind: kind,
      reminderSounds: soundsEnabled
    },
    sound: osCustomSound
  };
}

type SchedulableTrigger = Exclude<Notifications.NotificationTriggerInput, null>;

function withAndroidChannel<T extends SchedulableTrigger>(
  trigger: T,
  kind: ReminderKind,
  soundsEnabled: boolean
): T {
  const channelId = androidChannelId(kind, soundsEnabled);
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

export function computeHeatReminderDate(now = new Date()): Date | null {
  const windowStart = new Date(now);
  windowStart.setHours(12, 0, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setHours(15, 0, 0, 0);

  if (now >= windowEnd) {
    return null;
  }

  if (now < windowStart) {
    return windowStart;
  }

  return new Date(now.getTime() + 60_000);
}

export async function scheduleWaterReminder(soundsEnabled: boolean): Promise<void> {
  for (let slot = 1; slot <= WATER_REMINDER_SLOTS; slot += 1) {
    await Notifications.scheduleNotificationAsync({
      identifier: waterReminderIdentifier(slot),
      content: buildContent("water", soundsEnabled),
      trigger: withAndroidChannel(
        {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: WATER_INTERVAL_SEC * slot,
          repeats: false
        },
        "water",
        soundsEnabled
      )
    });
  }
}

export async function scheduleHeatReminder(soundsEnabled: boolean): Promise<void> {
  const when = computeHeatReminderDate();
  if (!when) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: FIELD_REMINDER_IDS.heat,
    content: buildContent("heat", soundsEnabled),
    trigger: withAndroidChannel(
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when
      },
      "heat",
      soundsEnabled
    )
  });
}

export async function presentBatteryLowReminder(soundsEnabled: boolean): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  initFieldReminderNotifications();
  await ensureFieldReminderChannels();

  const allowed = await ensureFieldReminderPermissions();
  if (!allowed) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: FIELD_REMINDER_IDS.battery,
    content: buildContent("battery", soundsEnabled),
    trigger: withAndroidChannel({ channelId: CHANNEL_BATTERY }, "battery", soundsEnabled)
  });
}

export async function cancelWorkdayFieldReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (entry) => isWaterReminderIdentifier(entry.identifier) || entry.identifier === FIELD_REMINDER_IDS.heat
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
  await scheduleHeatReminder(soundsEnabled);
}

const SOUND_TEST_ID = "field-reminder-sound-test";

export type ReminderSoundTestResult = "ok" | "denied" | "web";

/** Fire a sample reminder in a few seconds — for Settings sound check (no workday wait). */
export async function scheduleReminderSoundTest(
  kind: ReminderKind,
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

  // Expo Go plays water/heat from assets on tap — skip delayed OS notification (avoids default ding).
  if (usesInAppReminderSounds() && (kind === "water" || kind === "heat")) {
    return "ok";
  }

  const testId = `${SOUND_TEST_ID}-${kind}`;
  await Notifications.cancelScheduledNotificationAsync(testId);

  const copy = reminderCopy(kind);
  await Notifications.scheduleNotificationAsync({
    identifier: testId,
    content: {
      ...buildContent(kind, soundsEnabled),
      title: `[Test] ${copy.title}`,
      body: copy.body
    },
    trigger: withAndroidChannel(
      {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(3, delaySeconds),
        repeats: false
      },
      kind,
      soundsEnabled
    )
  });

  return "ok";
}
