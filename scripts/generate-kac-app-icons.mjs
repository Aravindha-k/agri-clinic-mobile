/**
 * Generates circular Android launcher mipmaps from the app icon logo.
 *
 * Source of truth (do not redesign / AI-recreate):
 *   assets/brand/logo_icon.png
 *
 * Composition already baked into the source:
 *   - opaque white circular orbit filling the mid-edges
 *   - green badge centered INSIDE that orbit with safe padding
 *   - transparent corners outside the white circle
 *
 * Generation:
 *   - legacy icon: source on opaque white square
 *   - adaptive foreground: source as-is (white orbit + inset badge)
 *   - adaptive background: opaque white
 */
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const TRANSPARENT_RGBA = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE_RGBA = { r: 255, g: 255, b: 255, alpha: 1 };
const ADAPTIVE_BACKGROUND = "#FFFFFF";
const ADAPTIVE_BACKGROUND_RGB = { r: 255, g: 255, b: 255 };
const APPROVED_SOURCE_SHA256 = "b689ce5ece9f35c3a8e78fb03bc301254ea020fb461f29cbc0566208ddc35a4a";

const SOURCE_APPROVED = path.join(root, "assets/brand/logo_icon.png");
const KAC_DIR = path.join(root, "assets/brand/kac");

const OUT_APP_ICON = path.join(root, "assets/brand/app_icon.png");
const OUT_APP_ICON_1024 = path.join(KAC_DIR, "app_icon_1024.png");
const OUT_APP_ICON_SOLID = path.join(KAC_DIR, "app_icon_1024_solid.png");
const OUT_ADAPTIVE_FG = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const OUT_ADAPTIVE_BG = path.join(KAC_DIR, "adaptive_icon_background_1024.png");
const OUT_ADAPTIVE_BG_ALIAS = path.join(KAC_DIR, "adaptive_icon_background.png");
const OUT_MASK_PREVIEW_PIXEL = path.join(KAC_DIR, "mask_preview_pixel_circle.png");
const OUT_MASK_PREVIEW_SAMSUNG = path.join(KAC_DIR, "mask_preview_samsung_squircle.png");
const OUT_MASK_PREVIEW_MIUI = path.join(KAC_DIR, "mask_preview_miui_rounded.png");
const ANDROID_RES = path.join(root, "android/app/src/main/res");

const MASTER_SIZE = 1024;
/** Green badge content inside the white orbit (baked into source). */
const MIN_BADGE_RATIO = 0.60;
const MAX_BADGE_RATIO = 0.72;

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
  const source = await fs.readFile(SOURCE_APPROVED);
  const digest = crypto.createHash("sha256").update(source).digest("hex");
  if (digest !== APPROVED_SOURCE_SHA256) {
    throw new Error(`Approved company logo fingerprint changed: ${digest}`);
  }
  const sourceMeta = await sharp(SOURCE_APPROVED).metadata().catch(() => null);
  if (
    !sourceMeta?.width ||
    !sourceMeta?.height ||
    sourceMeta.width !== sourceMeta.height ||
    sourceMeta.width < 512
  ) {
    throw new Error(`Approved company logo is unreadable: ${SOURCE_APPROVED}`);
  }
}

function launcherMaskSvg(kind, size) {
  if (kind === "circle") {
    return Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  }
  const radius = kind === "squircle" ? size * 0.22 : size * 0.16;
  return Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
}

async function buildLegacyIcon() {
  const source = await sharp(SOURCE_APPROVED)
    .resize(MASTER_SIZE, MASTER_SIZE, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: TRANSPARENT_RGBA
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: WHITE_RGBA
    }
  })
    .composite([{ input: source }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildAdaptiveForeground() {
  return sharp(SOURCE_APPROVED)
    .resize(MASTER_SIZE, MASTER_SIZE, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: TRANSPARENT_RGBA
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildAdaptiveBackground() {
  return sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 3,
      background: ADAPTIVE_BACKGROUND_RGB
    }
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function buildLauncherIcons() {
  await fs.mkdir(KAC_DIR, { recursive: true });

  const [master, foreground, background] = await Promise.all([
    buildLegacyIcon(),
    buildAdaptiveForeground(),
    buildAdaptiveBackground()
  ]);

  await fs.writeFile(OUT_ADAPTIVE_FG, foreground);
  await fs.writeFile(OUT_APP_ICON, master);
  await fs.writeFile(OUT_APP_ICON_1024, master);
  await fs.writeFile(OUT_APP_ICON_SOLID, master);
  await fs.writeFile(OUT_ADAPTIVE_BG, background);
  await fs.copyFile(OUT_ADAPTIVE_BG, OUT_ADAPTIVE_BG_ALIAS);
}

async function writeMaskPreview(outputPath, kind) {
  const foreground = await sharp(OUT_ADAPTIVE_FG).png().toBuffer();
  const icon = await sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: TRANSPARENT_RGBA
    }
  })
    .composite([{ input: foreground, left: 0, top: 0 }])
    .png()
    .toBuffer();

  await sharp(icon)
    .composite([{ input: launcherMaskSvg(kind, MASTER_SIZE), blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function writeMaskPreviews() {
  await Promise.all([
    writeMaskPreview(OUT_MASK_PREVIEW_PIXEL, "circle"),
    writeMaskPreview(OUT_MASK_PREVIEW_SAMSUNG, "squircle"),
    writeMaskPreview(OUT_MASK_PREVIEW_MIUI, "rounded")
  ]);
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

async function ensureAndroidColor(name, value) {
  const colorsPath = path.join(ANDROID_RES, "values", "colors.xml");
  const xml = await fs.readFile(colorsPath, "utf8");
  const next = xml.replace(new RegExp(`<color name="${name}">#[0-9A-Fa-f]{6,8}</color>`), `<color name="${name}">${value}</color>`);
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
  if (!colors.includes("iconBackground") || !colors.toUpperCase().includes(ADAPTIVE_BACKGROUND)) {
    throw new Error(`iconBackground must be ${ADAPTIVE_BACKGROUND}`);
  }
}

async function assertTransparentCorners(imagePath) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y] of [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1]
  ]) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if (alpha !== 0) {
      throw new Error(`${path.relative(root, imagePath)} corner must be transparent at ${x},${y}; alpha=${alpha}`);
    }
  }
}

async function assertOpaqueWhiteCorners(imagePath) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y] of [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1]
  ]) {
    const offset = (y * info.width + x) * 4;
    const rgba = [...data.subarray(offset, offset + 4)];
    if (rgba.some((value) => value !== 255)) {
      throw new Error(`${path.relative(root, imagePath)} corner must be opaque white; rgba=${rgba.join(",")}`);
    }
  }
}

function contentBounds(data, width, height, predicate) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      if (!predicate([data[o], data[o + 1], data[o + 2], data[o + 3]])) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX) throw new Error("No badge content detected in generated icon");
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function assertBadgeSafeInsideOrbit(imagePath) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = contentBounds(data, info.width, info.height, ([r, g, b, a]) => a > 8 && (r < 245 || g < 245 || b < 245));
  for (const dim of [bounds.width, bounds.height]) {
    const ratio = dim / info.width;
    if (ratio < MIN_BADGE_RATIO || ratio > MAX_BADGE_RATIO) {
      throw new Error(
        `${path.relative(root, imagePath)} green badge ratio ${ratio.toFixed(4)} must stay ${MIN_BADGE_RATIO}-${MAX_BADGE_RATIO} inside the white orbit`
      );
    }
  }
}

async function main() {
  await ensureApprovedSource();
  await buildLauncherIcons();
  await ensureAndroidColor("iconBackground", ADAPTIVE_BACKGROUND);
  await writeAndroidMipmaps();
  await writeMaskPreviews();
  await assertAdaptiveXml();
  await Promise.all([
    assertOpaqueWhiteCorners(OUT_APP_ICON),
    assertTransparentCorners(OUT_ADAPTIVE_FG),
    assertOpaqueWhiteCorners(OUT_ADAPTIVE_BG),
    assertBadgeSafeInsideOrbit(OUT_APP_ICON),
    assertBadgeSafeInsideOrbit(OUT_ADAPTIVE_FG)
  ]);

  console.log("Circular launcher icon generated:");
  console.log(`  source: ${path.relative(root, SOURCE_APPROVED)} (white orbit + inset badge)`);
  console.log(`  adaptive foreground: ${path.relative(root, OUT_ADAPTIVE_FG)}`);
  console.log(`  adaptive background: ${ADAPTIVE_BACKGROUND}`);
  console.log("  android/app/src/main/res/mipmap-*/ic_launcher*.webp");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
