/**
 * Promotes assets/brand/logo_icons.png to LAUNCHER slots only (no redesign).
 * Does NOT overwrite the in-app company logo (assets/brand/company_logo.png).
 *
 * - Legacy / Expo `icon`: exact source on white (full plate).
 * - Adaptive foreground: same source centered in the Android safe zone.
 * - Adaptive background: opaque white (`#FFFFFF`).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SRC = path.join(root, "assets/brand/logo_icons.png");
const SIZE = 1024;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * Full square artwork fits inside a circular launcher mask when side ≤ canvas/√2.
 * 0.70 keeps the complete white rounded-square visible on Pixel/Samsung/MIUI.
 */
export const ADAPTIVE_CONTENT_RATIO = 0.7;

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

function maskSvg(kind, size) {
  if (kind === "circle") {
    return Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
  }
  const radius = kind === "squircle" ? size * 0.22 : size * 0.16;
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
  );
}

/** Exact launcher source → 1024 square, no crop of content (contain). */
async function buildExactMaster() {
  return sharp(SRC)
    .resize(SIZE, SIZE, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: WHITE
    })
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Same artwork, inset + transparent padding for adaptive safe zone. */
async function buildAdaptiveForeground(master) {
  const contentSize = Math.round(SIZE * ADAPTIVE_CONTENT_RATIO);
  const inset = await sharp(master)
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
      background: WHITE
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
  const master = await buildExactMaster();
  const adaptive = await buildAdaptiveForeground(master);

  await fs.mkdir(path.join(root, "assets/brand/kac"), { recursive: true });
  await fs.writeFile(OUT.appIcon, master);
  await fs.writeFile(OUT.adaptiveFg, adaptive);
  await fs.writeFile(OUT.master, master);
  await fs.writeFile(OUT.solid, master);
  await fs.writeFile(OUT.source, master);

  const androidRes = path.join(root, "android/app/src/main/res");
  for (const [folder, size] of Object.entries(LEGACY)) {
    const dir = path.join(androidRes, folder);
    await fs.mkdir(dir, { recursive: true });
    for (const name of ["ic_launcher.webp", "ic_launcher_round.webp"]) {
      await sharp(master)
        .resize(size, size, { fit: "contain", background: WHITE })
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

  await sharp(master).resize(48, 48).png().toFile(path.join(root, "assets/brand/kac/preview_48.png"));
  await sharp(master).resize(64, 64).png().toFile(path.join(root, "assets/brand/kac/preview_64.png"));

  const meta = await sharp(OUT.appIcon).metadata();
  console.log(
    `Launcher-only promote from logo_icons.png (${meta.width}x${meta.height}); adaptive inset ${(ADAPTIVE_CONTENT_RATIO * 100).toFixed(0)}% — company_logo.png untouched`
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
