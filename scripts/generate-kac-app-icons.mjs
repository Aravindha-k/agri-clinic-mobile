/**
 * Generates production launcher icons from approved KAC Variant A assets.
 * Source: assets/brand/kac/app_icon_1024_solid.png
 *         assets/brand/kac/monogram_transparent.png
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const EMERALD = "#0B3D2E";
const KAC_DIR = path.join(root, "assets/brand/kac");
const SOURCE_SOLID = path.join(KAC_DIR, "app_icon_1024_solid.png");
const SOURCE_MONOGRAM = path.join(KAC_DIR, "monogram_transparent.png");

const OUT_APP_ICON = path.join(root, "assets/brand/app_icon.png");
const OUT_ADAPTIVE_FG = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const OUT_ADAPTIVE_BG = path.join(KAC_DIR, "adaptive_icon_background_1024.png");
const OUT_SVG = path.join(KAC_DIR, "kac_monogram.svg");
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

async function ensureSources() {
  for (const file of [SOURCE_SOLID, SOURCE_MONOGRAM]) {
    try {
      await fs.access(file);
    } catch {
      throw new Error(`Missing KAC source: ${file}`);
    }
  }
}

async function normalizeSolid1024() {
  await sharp(SOURCE_SOLID)
    .resize(1024, 1024, { fit: "cover" })
    .png()
    .toFile(OUT_APP_ICON);
}

async function buildAdaptiveForeground() {
  const monogram = await sharp(SOURCE_MONOGRAM)
    .resize(720, 720, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: monogram, gravity: "center" }])
    .png()
    .toFile(OUT_ADAPTIVE_FG);
}

async function buildAdaptiveBackground() {
  await sharp(SOURCE_SOLID)
    .resize(1024, 1024, { fit: "cover" })
    .blur(0.3)
    .png()
    .toFile(OUT_ADAPTIVE_BG);
}

async function writeSvg() {
  const pngBuffer = await fs.readFile(OUT_ADAPTIVE_FG);
  const b64 = pngBuffer.toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="KAC monogram">
  <title>Kavya Agri Clinic monogram</title>
  <rect width="1024" height="1024" fill="${EMERALD}"/>
  <image href="data:image/png;base64,${b64}" x="152" y="152" width="720" height="720" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
  await fs.writeFile(OUT_SVG, svg, "utf8");
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
  await ensureSources();
  await normalizeSolid1024();
  await buildAdaptiveForeground();
  await buildAdaptiveBackground();
  await writeSvg();
  await writeAndroidMipmaps();
  console.log("KAC Variant A icons generated:");
  console.log(`  ${path.relative(root, OUT_APP_ICON)}`);
  console.log(`  ${path.relative(root, OUT_ADAPTIVE_FG)}`);
  console.log(`  ${path.relative(root, OUT_ADAPTIVE_BG)}`);
  console.log(`  ${path.relative(root, OUT_SVG)}`);
  console.log("  android/app/src/main/res/mipmap-*/ic_launcher*.webp");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
