/**
 * Generates Android launcher mipmaps from the FINAL approved company icon artwork.
 *
 * Source of truth (do not redesign / AI-recreate):
 *   assets/brand/kac/launcher_icon_source.png
 *
 * This script only converts the approved artwork into a circular launcher icon,
 * then resizes that master into Expo + Android densities.
 * It must not draw a new mark, change colors, or alter typography.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const EMERALD = "#0B3D2E";
const EMERALD_RGB = { r: 11, g: 61, b: 46 };

const KAC_DIR = path.join(root, "assets/brand/kac");
const SOURCE_APPROVED = path.join(KAC_DIR, "launcher_icon_source.png");

const OUT_APP_ICON = path.join(root, "assets/brand/app_icon.png");
const OUT_APP_ICON_1024 = path.join(KAC_DIR, "app_icon_1024.png");
const OUT_APP_ICON_SOLID = path.join(KAC_DIR, "app_icon_1024_solid.png");
const OUT_ADAPTIVE_FG = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const OUT_ADAPTIVE_BG = path.join(KAC_DIR, "adaptive_icon_background_1024.png");
const OUT_ADAPTIVE_BG_ALIAS = path.join(KAC_DIR, "adaptive_icon_background.png");
const ANDROID_RES = path.join(root, "android/app/src/main/res");

const MASTER_SIZE = 1024;
const ICON_FILL_RATIO = 0.98;
const SOURCE_CENTER_CROP_RATIO = 0.78;
const CIRCLE_STROKE_RATIO = 0.01;
const GOLD = "#D6AD4F";

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

async function ensureApprovedSource() {
  try {
    await fs.access(SOURCE_APPROVED);
  } catch {
    throw new Error(`Missing approved launcher artwork: ${SOURCE_APPROVED}`);
  }

  const sourceMeta = await sharp(SOURCE_APPROVED).metadata();
  if (!sourceMeta.width || !sourceMeta.height) {
    throw new Error(`Approved launcher artwork is unreadable: ${SOURCE_APPROVED}`);
  }
}

function circularArtworkSvg({ artwork, size, iconSize, iconOffset }) {
  const stroke = Math.max(4, Math.round(size * CIRCLE_STROKE_RATIO));
  const radius = size / 2 - stroke / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="circleClip">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"/>
        </clipPath>
      </defs>
      <image x="${iconOffset}" y="${iconOffset}" width="${iconSize}" height="${iconSize}" href="data:image/png;base64,${artwork.toString("base64")}" clip-path="url(#circleClip)"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${GOLD}" stroke-width="${stroke}"/>
    </svg>`
  );
}

async function buildCircularIcon(size = MASTER_SIZE) {
  const iconSize = Math.round(size * ICON_FILL_RATIO);
  const iconOffset = Math.round((size - iconSize) / 2);
  const sourceMeta = await sharp(SOURCE_APPROVED).metadata();
  const sourceSide = Math.min(sourceMeta.width ?? 0, sourceMeta.height ?? 0);
  const cropSide = Math.round(sourceSide * SOURCE_CENTER_CROP_RATIO);
  const cropLeft = Math.max(0, Math.round(((sourceMeta.width ?? sourceSide) - cropSide) / 2));
  const cropTop = Math.max(0, Math.round(((sourceMeta.height ?? sourceSide) - cropSide) / 2));
  const artwork = await sharp(SOURCE_APPROVED)
    .extract({ left: cropLeft, top: cropTop, width: cropSide, height: cropSide })
    .resize(iconSize, iconSize, { fit: "cover", position: "centre", kernel: sharp.kernel.lanczos3 })
    .modulate({ brightness: 1.02, saturation: 1.03 })
    .sharpen({ sigma: 0.7, m1: 0.8, m2: 1.4 })
    .png()
    .toBuffer();

  const buffer = await sharp(circularArtworkSvg({ artwork, size, iconSize, iconOffset }))
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { buffer, cropSide };
}

async function buildLauncherIcons() {
  const master = await buildCircularIcon();
  await fs.writeFile(OUT_APP_ICON, master.buffer);
  await fs.writeFile(OUT_APP_ICON_1024, master.buffer);
  await fs.writeFile(OUT_APP_ICON_SOLID, master.buffer);
  await fs.writeFile(OUT_ADAPTIVE_FG, master.buffer);
  const iconSize = Math.round(MASTER_SIZE * ICON_FILL_RATIO);
  return {
    iconSize,
    margin: Math.round((MASTER_SIZE - iconSize) / 2),
    cropSide: master.cropSide
  };
}

async function buildSolidEmeraldBackground() {
  await sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 3,
      background: EMERALD_RGB
    }
  })
    .png()
    .toFile(OUT_ADAPTIVE_BG);
  await fs.copyFile(OUT_ADAPTIVE_BG, OUT_ADAPTIVE_BG_ALIAS);
}

async function writeWebp(inputPath, outputPath, size) {
  await sharp(inputPath)
    .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 100, lossless: true })
    .toFile(outputPath);
}

async function cleanAndroidLauncherResources() {
  const files = ["ic_launcher.webp", "ic_launcher_round.webp", "ic_launcher_foreground.webp"];
  for (const folder of new Set([...Object.keys(LEGACY_SIZES), ...Object.keys(FOREGROUND_SIZES)])) {
    const dir = path.join(ANDROID_RES, folder);
    for (const file of files) {
      await fs.rm(path.join(dir, file), { force: true }).catch(() => undefined);
    }
  }
}

async function writeAndroidMipmaps() {
  await cleanAndroidLauncherResources();

  for (const [folder, size] of Object.entries(LEGACY_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    await writeWebp(OUT_APP_ICON_1024, path.join(dir, "ic_launcher.webp"), size);
    await writeWebp(OUT_APP_ICON_1024, path.join(dir, "ic_launcher_round.webp"), size);
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    await writeWebp(OUT_ADAPTIVE_FG, path.join(dir, "ic_launcher_foreground.webp"), size);
  }
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
  if (!colors.includes("iconBackground") || !colors.toUpperCase().includes("0B3D2E")) {
    throw new Error("iconBackground must be #0B3D2E");
  }
}

async function assertNoWhiteCornersOnLegacy() {
  const sample = path.join(ANDROID_RES, "mipmap-xxxhdpi", "ic_launcher.webp");
  const { data, info } = await sharp(sample).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => {
    const i = (y * info.width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  for (const [x, y] of [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1]
  ]) {
    const [r, g, b] = at(x, y);
    if (r > 200 && g > 200 && b > 200) {
      throw new Error(`Legacy launcher still has white corner at ${x},${y} rgb(${r},${g},${b})`);
    }
  }
  console.log("  legacy corner check OK (transparent circular edge, not white)");
}

async function main() {
  await ensureApprovedSource();
  const composition = await buildLauncherIcons();
  await buildSolidEmeraldBackground();
  await writeAndroidMipmaps();
  await assertAdaptiveXml();
  await assertNoWhiteCornersOnLegacy();

  console.log("FINAL approved launcher icon shipped (circular edge, clear center):");
  console.log(`  source: ${path.relative(root, SOURCE_APPROVED)}`);
  console.log(`  circular artwork size: ${composition.iconSize}px (${Math.round(ICON_FILL_RATIO * 100)}%)`);
  console.log(`  center crop: ${composition.cropSide}px (${Math.round(SOURCE_CENTER_CROP_RATIO * 100)}% of source side)`);
  console.log(`  transparent canvas margin: ${composition.margin}px`);
  console.log(`  circular edge stroke: ${Math.round(MASTER_SIZE * CIRCLE_STROKE_RATIO)}px ${GOLD}`);
  console.log(`  ${path.relative(root, OUT_APP_ICON)}`);
  console.log(`  ${path.relative(root, OUT_ADAPTIVE_FG)}`);
  console.log(`  adaptive background: ${EMERALD}`);
  console.log("  android/app/src/main/res/mipmap-*/ic_launcher*.webp");
  console.log("  android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml (unchanged)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
