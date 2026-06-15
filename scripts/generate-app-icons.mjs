/**
 * Generates launcher icons from assets/brand/logo-icon.png (symbol-only, no text).
 * Outputs app-icon.png, adaptive-icon-foreground.png, and Android mipmap assets.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const BRAND_GREEN = "#0F5132";
const SOURCE = path.join(root, "assets/brand/logo-icon.png");
const OUT_APP_ICON = path.join(root, "assets/brand/app-icon.png");
const OUT_ADAPTIVE_FG = path.join(root, "assets/brand/adaptive-icon-foreground.png");
const ANDROID_RES = path.join(root, "android/app/src/main/res");

const LEGACY_SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192
};

const FOREGROUND_SIZES = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432
};

async function ensureSource() {
  try {
    await fs.access(SOURCE);
  } catch {
    throw new Error(`Missing symbol source: ${SOURCE}`);
  }
}

async function buildAppIcon() {
  const canvas = sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: BRAND_GREEN
    }
  });

  const emblem = await sharp(SOURCE)
    .resize(680, 680, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await canvas
    .composite([{ input: emblem, gravity: "center" }])
    .png()
    .toFile(OUT_APP_ICON);
}

async function buildAdaptiveForeground() {
  const canvas = sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  const emblem = await sharp(SOURCE)
    .resize(620, 620, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await canvas
    .composite([{ input: emblem, gravity: "center" }])
    .png()
    .toFile(OUT_ADAPTIVE_FG);
}

async function writeWebp(inputPath, outputPath, size) {
  await sharp(inputPath)
    .resize(size, size, { fit: "cover" })
    .webp({ quality: 95 })
    .toFile(outputPath);
}

async function writeAndroidMipmaps() {
  for (const [folder, size] of Object.entries(LEGACY_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    await writeWebp(OUT_APP_ICON, path.join(dir, "ic_launcher.webp"), size);
    await writeWebp(OUT_APP_ICON, path.join(dir, "ic_launcher_round.webp"), size);
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    await writeWebp(OUT_ADAPTIVE_FG, path.join(dir, "ic_launcher_foreground.webp"), size);
  }
}

async function main() {
  await ensureSource();
  await buildAppIcon();
  await buildAdaptiveForeground();
  await writeAndroidMipmaps();
  console.log("Generated:");
  console.log(`  ${path.relative(root, OUT_APP_ICON)}`);
  console.log(`  ${path.relative(root, OUT_ADAPTIVE_FG)}`);
  console.log("  android/app/src/main/res/mipmap-*/ic_launcher*.webp");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
