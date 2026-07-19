/**
 * Promotes the official circular company logo to LAUNCHER slots only.
 *
 * - Source: assets/brand/logo_circle_transparent.png (canonical Today/Login mark)
 * - Adaptive foreground: logo only, transparent padding, ~68% safe-zone inset
 * - Adaptive / legacy background: official Kavya green (#0F6B43)
 * - Never overwrites the canonical in-app logo file
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
/** Official circular company logo — read-only source for launcher generation. */
const SRC = path.join(root, "assets/brand/logo_circle_transparent.png");
const SIZE = 1024;
/** Enterprise primary green — adaptive plate behind the circular mark. */
export const KAVYA_GREEN = "#0F6B43";
const KAVYA_GREEN_RGB = { r: 15, g: 107, b: 67, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Full circular artwork fits OEM masks when side ≈ canvas * 0.66–0.70.
 * Keep ~68% so Pixel/Samsung/MIUI never clip the ring.
 */
export const ADAPTIVE_CONTENT_RATIO = 0.68;

const OUT = {
  appIcon: path.join(root, "assets/brand/app_icon.png"),
  adaptiveFg: path.join(root, "assets/brand/adaptive_icon_foreground.png"),
  master: path.join(root, "assets/brand/kac/app_icon_1024.png"),
  solid: path.join(root, "assets/brand/kac/app_icon_1024_solid.png"),
  source: path.join(root, "assets/brand/launcher_icon_source.png")
};

const LEGACY = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192
};

const FG = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432
};

function circleMaskSvg(size) {
  const c = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${c}" cy="${c}" r="${c}" fill="#fff"/></svg>`
  );
}

function maskSvg(kind, size) {
  if (kind === "circle") {
    return circleMaskSvg(size);
  }
  const radius = kind === "squircle" ? size * 0.22 : size * 0.16;
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
}

/**
 * Square logo with opaque white corners → circular mark on transparent canvas.
 * Preserves white interior of the emblem (cross gaps).
 */
async function buildCircularTransparent(size = SIZE) {
  const fitted = await sharp(SRC)
    .resize(size, size, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: TRANSPARENT
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  return sharp(fitted)
    .composite([{ input: circleMaskSvg(size), blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Circular logo composited on Kavya green — Expo / legacy launcher icon. */
async function buildGreenPlate(circlePng) {
  return sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: KAVYA_GREEN_RGB
    }
  })
    .composite([{ input: circlePng }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Same circular artwork, inset + transparent padding for adaptive safe zone. */
async function buildAdaptiveForeground(circlePng) {
  const contentSize = Math.round(SIZE * ADAPTIVE_CONTENT_RATIO);
  const inset = await sharp(circlePng)
    .resize(contentSize, contentSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: TRANSPARENT
    })
    .png()
    .toBuffer();

  const left = Math.round((SIZE - contentSize) / 2);
  const top = left;

  return sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: TRANSPARENT
    }
  })
    .composite([{ input: inset, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildInstalledPreview(adaptiveFg, kind) {
  const composed = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: KAVYA_GREEN_RGB
    }
  })
    .composite([{ input: adaptiveFg }])
    .png()
    .toBuffer();

  return sharp(composed)
    .composite([{ input: maskSvg(kind, SIZE), blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function promoteLogoIcons() {
  const circle = await buildCircularTransparent(SIZE);
  const plate = await buildGreenPlate(circle);
  const adaptive = await buildAdaptiveForeground(circle);

  await fs.mkdir(path.join(root, "assets/brand/kac"), { recursive: true });
  // Never write back to the canonical Today/Login logo asset.
  await fs.writeFile(OUT.appIcon, plate);
  await fs.writeFile(OUT.adaptiveFg, adaptive);
  await fs.writeFile(OUT.master, plate);
  await fs.writeFile(OUT.solid, plate);
  await fs.writeFile(OUT.source, plate);

  const androidRes = path.join(root, "android/app/src/main/res");
  for (const [folder, size] of Object.entries(LEGACY)) {
    const dir = path.join(androidRes, folder);
    await fs.mkdir(dir, { recursive: true });
    for (const name of ["ic_launcher.webp", "ic_launcher_round.webp"]) {
      await sharp(plate)
        .resize(size, size, { fit: "contain", background: KAVYA_GREEN_RGB })
        .webp({ quality: 100, lossless: true })
        .toFile(path.join(dir, name));
    }
  }
  for (const [folder, size] of Object.entries(FG)) {
    const dir = path.join(androidRes, folder);
    await fs.mkdir(dir, { recursive: true });
    await sharp(adaptive)
      .resize(size, size, { fit: "contain", background: TRANSPARENT })
      .webp({ quality: 100, lossless: true })
      .toFile(path.join(dir, "ic_launcher_foreground.webp"));
  }

  for (const [kind, file] of [
    ["circle", "mask_preview_pixel_circle.png"],
    ["squircle", "mask_preview_samsung_squircle.png"],
    ["rounded", "mask_preview_miui_rounded.png"]
  ]) {
    const preview = await buildInstalledPreview(adaptive, kind);
    await fs.writeFile(path.join(root, "assets/brand/kac", file), preview);
  }

  await sharp(plate).resize(48, 48).png().toFile(path.join(root, "assets/brand/kac/preview_48.png"));
  await sharp(plate).resize(64, 64).png().toFile(path.join(root, "assets/brand/kac/preview_64.png"));

  const meta = await sharp(SRC).metadata();
  console.log(
    `Launcher promote from logo_circle_transparent.png (${meta.width}x${meta.height}); adaptive inset ${(ADAPTIVE_CONTENT_RATIO * 100).toFixed(0)}%; bg ${KAVYA_GREEN}`
  );
}

export { promoteLogoIcons };

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  promoteLogoIcons().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
