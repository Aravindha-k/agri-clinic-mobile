import { Audio } from "expo-av";
import { isExpoGo } from "../utils/expoRuntime";

const HYDRATION_CHIME = require("../../assets/sounds/hydration_chime.wav");

/** Softer playback for in-app preview (Expo Go fallback). */
const IN_APP_VOLUME = 0.82;

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

export async function playFieldReminderSound(): Promise<void> {
  const now = Date.now();
  if (now - lastPlayAt < 900) {
    return;
  }
  lastPlayAt = now;

  try {
    await ensureAudioMode();
    await stopActiveSound();

    const { sound } = await Audio.Sound.createAsync(HYDRATION_CHIME, {
      shouldPlay: true,
      volume: IN_APP_VOLUME
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

export function parseFieldReminderKind(value: unknown): "water" | null {
  if (value === "water") {
    return "water";
  }
  return null;
}
