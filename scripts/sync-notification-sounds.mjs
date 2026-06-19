/**
 * Copies reminder wav files into android/app/src/main/res/raw for custom notification sounds.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sounds = ["water_pour.wav", "heat.wav"];
const rawDir = resolve(root, "android/app/src/main/res/raw");

if (!existsSync(resolve(root, "android"))) {
  process.exit(0);
}

mkdirSync(rawDir, { recursive: true });

for (const name of sounds) {
  const source = resolve(root, "assets/sounds", name);
  const target = resolve(rawDir, name);
  if (!existsSync(source)) {
    console.warn(`[sync-notification-sounds] missing ${source}`);
    continue;
  }
  copyFileSync(source, target);
}

console.log("[sync-notification-sounds] copied water_pour.wav and heat.wav to android res/raw");
