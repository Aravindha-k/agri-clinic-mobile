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
const OUT_APP_ICON_1024 = path.join(KAC_DIR, "app_icon_1024.png");
const OUT_ADAPTIVE_FG = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const OUT_ADAPTIVE_BG = path.join(KAC_DIR, "adaptive_icon_background_1024.png");
const OUT_ADAPTIVE_BG_ALIAS = path.join(KAC_DIR, "adaptive_icon_background.png");
const OUT_SVG = path.join(KAC_DIR, "kac_monogram.svg");
const ANDROID_RES = path.join(root, "android/app/src/main/res");

/** Adaptive-icon safe zone (~66% diameter) — prevents clipping on circle/squircle masks. */
const MONOGRAM_SAFE_PX = 660;

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
  await fs.copyFile(OUT_APP_ICON, OUT_APP_ICON_1024);
}

async function buildAdaptiveForeground() {
  const monogram = await sharp(SOURCE_MONOGRAM)
    .resize(MONOGRAM_SAFE_PX, MONOGRAM_SAFE_PX, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
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
  await fs.copyFile(OUT_ADAPTIVE_BG, OUT_ADAPTIVE_BG_ALIAS);
}

async function writeSvg() {
  const pngBuffer = await fs.readFile(OUT_ADAPTIVE_FG);
  const b64 = pngBuffer.toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="KAC monogram">
  <title>Kavya Agri Clinic monogram</title>
  <rect width="1024" height="1024" fill="${EMERALD}"/>
  <image href="data:image/png;base64,${b64}" x="${(1024 - MONOGRAM_SAFE_PX) / 2}" y="${(1024 - MONOGRAM_SAFE_PX) / 2}" width="${MONOGRAM_SAFE_PX}" height="${MONOGRAM_SAFE_PX}" preserveAspectRatio="xMidYMid meet"/>
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

async function writeMaskPreviews() {
  const fg = await sharp(OUT_ADAPTIVE_FG).resize(512, 512).png().toBuffer();
  const bg = await sharp(OUT_ADAPTIVE_BG).resize(512, 512).png().toBuffer();
  const composed = await sharp(bg)
    .composite([{ input: fg, gravity: "center" }])
    .png()
    .toBuffer();

  const masks = {
    "mask_preview_pixel_circle.png": Buffer.from(
      `<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="white"/></svg>`
    ),
    "mask_preview_samsung_squircle.png": Buffer.from(
      `<svg width="512" height="512"><rect x="32" y="32" width="448" height="448" rx="112" fill="white"/></svg>`
    ),
    "mask_preview_miui_rounded.png": Buffer.from(
      `<svg width="512" height="512"><rect x="48" y="48" width="416" height="416" rx="96" fill="white"/></svg>`
    )
  };

  for (const [name, maskSvg] of Object.entries(masks)) {
    const masked = await sharp(composed)
      .composite([{ input: maskSvg, blend: "dest-in" }])
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 240, g: 240, b: 240, alpha: 255 }
      }
    })
      .composite([{ input: masked, gravity: "center" }])
      .png()
      .toFile(path.join(KAC_DIR, name));
  }
  console.log("  assets/brand/kac/mask_preview_*.png (QA only)");
}

async function main() {
  await ensureSources();
  await normalizeSolid1024();
  await buildAdaptiveForeground();
  await buildAdaptiveBackground();
  await writeSvg();
  await writeAndroidMipmaps();
  await writeMaskPreviews();
  console.log("KAC Variant A icons generated:");
  console.log(`  ${path.relative(root, OUT_APP_ICON)}`);
  console.log(`  ${path.relative(root, OUT_ADAPTIVE_FG)}`);
  console.log(`  ${path.relative(root, OUT_APP_ICON_1024)}`);
  console.log(`  ${path.relative(root, OUT_ADAPTIVE_BG_ALIAS)}`);
  console.log(`  ${path.relative(root, OUT_SVG)}`);
  console.log("  android/app/src/main/res/mipmap-*/ic_launcher*.webp");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
