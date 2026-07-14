/**
 * Generates Android launcher mipmaps from the FINAL approved app icon.
 *
 * Source of truth (do not redesign / AI-recreate):
 *   assets/brand/kac/app_icon_1024_approved.png
 *
 * This script only resizes the approved artwork into Expo + Android densities.
 * It must not draw a new monogram, change colors, or alter typography.
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
const SOURCE_APPROVED = path.join(KAC_DIR, "app_icon_1024_approved.png");

const OUT_APP_ICON = path.join(root, "assets/brand/app_icon.png");
const OUT_APP_ICON_1024 = path.join(KAC_DIR, "app_icon_1024.png");
const OUT_APP_ICON_SOLID = path.join(KAC_DIR, "app_icon_1024_solid.png");
const OUT_ADAPTIVE_FG = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const OUT_ADAPTIVE_BG = path.join(KAC_DIR, "adaptive_icon_background_1024.png");
const OUT_ADAPTIVE_BG_ALIAS = path.join(KAC_DIR, "adaptive_icon_background.png");
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

async function ensureApprovedSource() {
  try {
    await fs.access(SOURCE_APPROVED);
  } catch {
    throw new Error(
      `Missing FINAL approved launcher icon: ${SOURCE_APPROVED}\n` +
        "Place the approved 1024×1024 artwork at that path before running icons:generate."
    );
  }
  const meta = await sharp(SOURCE_APPROVED).metadata();
  if (!meta.width || !meta.height || meta.width !== meta.height) {
    throw new Error(`Approved icon must be square. Got ${meta.width}x${meta.height}`);
  }
}

/** Exact copy (PNG) into brand + Expo paths — no filter / redesign. */
async function publishApprovedCopies() {
  const buf = await fs.readFile(SOURCE_APPROVED);
  await fs.writeFile(OUT_APP_ICON, buf);
  await fs.writeFile(OUT_APP_ICON_1024, buf);
  await fs.writeFile(OUT_APP_ICON_SOLID, buf);
  await fs.writeFile(OUT_ADAPTIVE_FG, buf);
}

async function buildSolidEmeraldBackground() {
  await sharp({
    create: {
      width: 1024,
      height: 1024,
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

async function writeAndroidMipmaps() {
  for (const [folder, size] of Object.entries(LEGACY_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    // Legacy launchers: approved artwork exactly (resized only).
    await writeWebp(SOURCE_APPROVED, path.join(dir, "ic_launcher.webp"), size);
    await writeWebp(SOURCE_APPROVED, path.join(dir, "ic_launcher_round.webp"), size);
  }

  for (const [folder, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    // Adaptive foreground: same approved artwork (resized only).
    await writeWebp(SOURCE_APPROVED, path.join(dir, "ic_launcher_foreground.webp"), size);
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
  console.log(`  legacy corner check OK (emerald field, not white)`);
}

async function main() {
  await ensureApprovedSource();
  await publishApprovedCopies();
  await buildSolidEmeraldBackground();
  await writeAndroidMipmaps();
  await assertAdaptiveXml();
  await assertNoWhiteCornersOnLegacy();

  console.log("FINAL approved launcher icon shipped (resize only):");
  console.log(`  source: ${path.relative(root, SOURCE_APPROVED)}`);
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
