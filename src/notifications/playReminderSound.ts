import { Audio } from "expo-av";
import { isExpoGo } from "../utils/expoRuntime";

export type PlayableReminderKind = "water" | "heat";

const REMINDER_SOUND_FILES: Record<PlayableReminderKind, number> = {
  water: require("../../assets/sounds/water_pour.wav"),
  heat: require("../../assets/sounds/heat.wav")
};

/** Softer playback for in-app preview (Expo Go fallback). */
const IN_APP_VOLUME: Record<PlayableReminderKind, number> = {
  water: 0.72,
  heat: 0.78
};

let audioReady = false;
let activeSound: Audio.Sound | null = null;
let lastPlayAt = 0;

/** Expo Go cannot load custom wav into the OS notification — play in-app instead. */
export function usesInAppReminderSounds(): boolean {
  return isExpoGo();
}

async function ensureAudioMode(): Promise<void> {
  if (audioReady) {
    return;
  }
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false
  });
  audioReady = true;
}

async function stopActiveSound(): Promise<void> {
  if (!activeSound) {
    return;
  }
  try {
    await activeSound.stopAsync();
    await activeSound.unloadAsync();
  } catch {
    /* already stopped */
  }
  activeSound = null;
}

export async function playFieldReminderSound(kind: PlayableReminderKind): Promise<void> {
  const now = Date.now();
  if (now - lastPlayAt < 900) {
    return;
  }
  lastPlayAt = now;

  try {
    await ensureAudioMode();
    await stopActiveSound();

    const { sound } = await Audio.Sound.createAsync(REMINDER_SOUND_FILES[kind], {
      shouldPlay: true,
      volume: IN_APP_VOLUME[kind]
    });
    activeSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
        if (activeSound === sound) {
          activeSound = null;
        }
      }
    });
  } catch {
    /* ignore — notification banner still shows */
  }
}

export function parseFieldReminderKind(value: unknown): PlayableReminderKind | "battery" | null {
  if (value === "water" || value === "heat" || value === "battery") {
    return value;
  }
  return null;
}
