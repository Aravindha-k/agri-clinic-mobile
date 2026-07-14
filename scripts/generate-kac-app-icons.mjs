/**
 * Generates Android launcher mipmaps from the FINAL approved company seal.
 *
 * Source of truth (do not redesign / AI-recreate):
 *   assets/brand/logo_splash.png
 *
 * This script only recomposes the approved seal larger on the approved emerald
 * icon background, then resizes that master into Expo + Android densities.
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
const SOURCE_APPROVED = path.join(root, "assets/brand/logo_splash.png");
const APPROVED_BACKGROUND = path.join(KAC_DIR, "app_icon_1024_approved.png");

const OUT_APP_ICON = path.join(root, "assets/brand/app_icon.png");
const OUT_APP_ICON_1024 = path.join(KAC_DIR, "app_icon_1024.png");
const OUT_APP_ICON_SOLID = path.join(KAC_DIR, "app_icon_1024_solid.png");
const OUT_ADAPTIVE_FG = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const OUT_ADAPTIVE_BG = path.join(KAC_DIR, "adaptive_icon_background_1024.png");
const OUT_ADAPTIVE_BG_ALIAS = path.join(KAC_DIR, "adaptive_icon_background.png");
const ANDROID_RES = path.join(root, "android/app/src/main/res");

const MASTER_SIZE = 1024;
const LEGACY_LOGO_FILL_RATIO = 0.92;
const ADAPTIVE_FOREGROUND_FILL_RATIO = 0.92;

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
    await fs.access(APPROVED_BACKGROUND);
  } catch {
    throw new Error(
      `Missing approved logo/background:\n` +
        `  logo: ${SOURCE_APPROVED}\n` +
        `  background: ${APPROVED_BACKGROUND}`
    );
  }

  const logoMeta = await sharp(SOURCE_APPROVED).metadata();
  if (!logoMeta.width || !logoMeta.height || logoMeta.width !== logoMeta.height) {
    throw new Error(`Approved logo must be square. Got ${logoMeta.width}x${logoMeta.height}`);
  }

  const bgMeta = await sharp(APPROVED_BACKGROUND).metadata();
  if (bgMeta.width !== MASTER_SIZE || bgMeta.height !== MASTER_SIZE) {
    throw new Error(
      `Approved background must be ${MASTER_SIZE}x${MASTER_SIZE}. Got ${bgMeta.width}x${bgMeta.height}`
    );
  }
}

async function renderLogo(size) {
  return sharp(SOURCE_APPROVED)
    .resize(size, size, { fit: "contain", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
}

async function buildMasterIcon() {
  const logoSize = Math.round(MASTER_SIZE * LEGACY_LOGO_FILL_RATIO);
  const logoOffset = Math.round((MASTER_SIZE - logoSize) / 2);
  const logo = await renderLogo(logoSize);
  const master = await sharp(APPROVED_BACKGROUND)
    .resize(MASTER_SIZE, MASTER_SIZE, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .composite([{ input: logo, left: logoOffset, top: logoOffset }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(OUT_APP_ICON, master);
  await fs.writeFile(OUT_APP_ICON_1024, master);
  await fs.writeFile(OUT_APP_ICON_SOLID, master);
  return { logoSize, logoOffset };
}

async function buildAdaptiveForeground() {
  const logoSize = Math.round(MASTER_SIZE * ADAPTIVE_FOREGROUND_FILL_RATIO);
  const logoOffset = Math.round((MASTER_SIZE - logoSize) / 2);
  const logo = await renderLogo(logoSize);
  await sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: logo, left: logoOffset, top: logoOffset }])
    .png({ compressionLevel: 9 })
    .toFile(OUT_ADAPTIVE_FG);
  return { logoSize, logoOffset };
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
  console.log("  legacy corner check OK (emerald field, not white)");
}

async function main() {
  await ensureApprovedSource();
  const composition = await buildMasterIcon();
  const adaptiveComposition = await buildAdaptiveForeground();
  await buildSolidEmeraldBackground();
  await writeAndroidMipmaps();
  await assertAdaptiveXml();
  await assertNoWhiteCornersOnLegacy();

  console.log("FINAL approved launcher icon shipped (approved logo, larger composition):");
  console.log(`  source: ${path.relative(root, SOURCE_APPROVED)}`);
  console.log(`  approved background: ${path.relative(root, APPROVED_BACKGROUND)}`);
  console.log(`  legacy logo size: ${composition.logoSize}px (${Math.round(LEGACY_LOGO_FILL_RATIO * 100)}%)`);
  console.log(`  legacy safe margin: ${composition.logoOffset}px`);
  console.log(
    `  adaptive foreground logo size: ${adaptiveComposition.logoSize}px (${Math.round(ADAPTIVE_FOREGROUND_FILL_RATIO * 100)}%)`
  );
  console.log(`  adaptive foreground transparent margin: ${adaptiveComposition.logoOffset}px`);
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
