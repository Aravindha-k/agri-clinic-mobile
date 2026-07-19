/**
 * CI entry point — promotes circular logo and validates Android launcher wiring.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { LAUNCHER_BG } from "./promote-logo-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ANDROID_RES = path.join(root, "android/app/src/main/res");
const ADAPTIVE_BACKGROUND = LAUNCHER_BG;
const ADAPTIVE_BACKGROUND_RGB = { r: 0, g: 77, b: 23 };
const OUT_ADAPTIVE_BG = path.join(root, "assets/brand/kac/adaptive_icon_background_1024.png");
const OUT_ADAPTIVE_BG_ALIAS = path.join(root, "assets/brand/kac/adaptive_icon_background.png");

async function buildAdaptiveBackground() {
  return sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: ADAPTIVE_BACKGROUND_RGB
    }
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function ensureAndroidColor(name, value) {
  const colorsPath = path.join(ANDROID_RES, "values", "colors.xml");
  const xml = await fs.readFile(colorsPath, "utf8");
  const next = xml.replace(
    new RegExp(`<color name="${name}">#[0-9A-Fa-f]{6,8}</color>`),
    `<color name="${name}">${value}</color>`
  );
  if (next === xml && !xml.includes(`name="${name}"`)) {
    throw new Error(`Missing Android color ${name} in ${colorsPath}`);
  }
  await fs.writeFile(colorsPath, next);
}

async function assertAdaptiveXml() {
  const xmlPaths = [
    path.join(ANDROID_RES, "mipmap-anydpi-v26", "ic_launcher.xml"),
    path.join(ANDROID_RES, "mipmap-anydpi-v26", "ic_launcher_round.xml")
  ];
  for (const xmlPath of xmlPaths) {
    const xml = await fs.readFile(xmlPath, "utf8");
    if (!xml.includes("@color/iconBackground") || !xml.includes("@mipmap/ic_launcher_foreground")) {
      throw new Error(`Adaptive XML unexpected: ${xmlPath}`);
    }
  }
  const colors = await fs.readFile(path.join(ANDROID_RES, "values", "colors.xml"), "utf8");
  if (!colors.includes("iconBackground") || !colors.toUpperCase().includes(ADAPTIVE_BACKGROUND.toUpperCase())) {
    throw new Error(`iconBackground must be ${ADAPTIVE_BACKGROUND}`);
  }
  if (colors.toUpperCase().includes("#0F6B43")) {
    throw new Error("Obsolete bright green #0F6B43 must not remain as iconBackground");
  }
}

async function main() {
  const { promoteLogoIcons } = await import("./promote-logo-icons.mjs");
  await promoteLogoIcons();

  const background = await buildAdaptiveBackground();
  await fs.mkdir(path.dirname(OUT_ADAPTIVE_BG), { recursive: true });
  await fs.writeFile(OUT_ADAPTIVE_BG, background);
  await fs.copyFile(OUT_ADAPTIVE_BG, OUT_ADAPTIVE_BG_ALIAS);

  await ensureAndroidColor("iconBackground", ADAPTIVE_BACKGROUND);
  await assertAdaptiveXml();

  console.log("KAC launcher icons generated:");
  console.log("  source: assets/brand/logo_circle_transparent.png");
  console.log(`  adaptive background: ${ADAPTIVE_BACKGROUND}`);
  console.log("  android/app/src/main/res/mipmap-*/ic_launcher*.webp");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
