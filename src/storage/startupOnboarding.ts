import * as SecureStore from "expo-secure-store";

const STORY_SEEN_KEY = "kavya_startup_story_seen";

export async function hasSeenStartupStory(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(STORY_SEEN_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export async function markStartupStorySeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORY_SEEN_KEY, "1");
  } catch {
    /* non-critical */
  }
}
