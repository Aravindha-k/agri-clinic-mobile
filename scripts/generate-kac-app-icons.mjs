/**
 * Generates circular Android launcher mipmaps from the app icon logo.
 *
 * Source of truth (do not redesign / AI-recreate):
 *   assets/brand/logo_icon.png
 *
 * Composition only:
 *   - legacy icon is a large circular logo with transparent corners
 *   - adaptive foreground keeps the circular logo inside Android's safe zone
 *   - adaptive background matches the logo's outer green, avoiding white corners
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const TRANSPARENT_RGBA = { r: 0, g: 0, b: 0, alpha: 0 };
const ADAPTIVE_BACKGROUND = "#004D17";
const ADAPTIVE_BACKGROUND_RGB = { r: 0, g: 77, b: 23 };

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
const LEGACY_LOGO_DIAMETER = 960;
const ADAPTIVE_LOGO_DIAMETER = 720;

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
  const sourceMeta = await sharp(SOURCE_APPROVED).metadata().catch(() => null);
  if (!sourceMeta?.width || !sourceMeta?.height) {
    throw new Error(`Approved company logo is unreadable: ${SOURCE_APPROVED}`);
  }
}

function circularLogoSvg({ logo, size, diameter }) {
  const offset = Math.round((size - diameter) / 2);
  const radius = diameter / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="logoClip">
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"/>
        </clipPath>
      </defs>
      <image x="${offset}" y="${offset}" width="${diameter}" height="${diameter}" href="data:image/png;base64,${logo.toString("base64")}" clip-path="url(#logoClip)"/>
    </svg>`
  );
}

function launcherMaskSvg(kind, size) {
  if (kind === "circle") {
    return Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  }
  const radius = kind === "squircle" ? size * 0.22 : size * 0.16;
  return Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`);
}

async function buildCircularLogo(diameter) {
  const logo = await sharp(SOURCE_APPROVED)
    .resize(diameter, diameter, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: TRANSPARENT_RGBA
    })
    .png()
    .toBuffer();

  return sharp(circularLogoSvg({ logo, size: MASTER_SIZE, diameter }))
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
    buildCircularLogo(LEGACY_LOGO_DIAMETER),
    buildCircularLogo(ADAPTIVE_LOGO_DIAMETER),
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

async function main() {
  await ensureApprovedSource();
  await buildLauncherIcons();
  await ensureAndroidColor("iconBackground", ADAPTIVE_BACKGROUND);
  await writeAndroidMipmaps();
  await writeMaskPreviews();
  await assertAdaptiveXml();
  await Promise.all([assertTransparentCorners(OUT_APP_ICON), assertTransparentCorners(OUT_ADAPTIVE_FG)]);

  console.log("Circular launcher icon generated:");
  console.log(`  source: ${path.relative(root, SOURCE_APPROVED)}`);
  console.log(`  legacy logo diameter: ${LEGACY_LOGO_DIAMETER}px`);
  console.log(`  adaptive logo diameter: ${ADAPTIVE_LOGO_DIAMETER}px`);
  console.log(`  adaptive foreground: ${path.relative(root, OUT_ADAPTIVE_FG)}`);
  console.log(`  adaptive background: ${ADAPTIVE_BACKGROUND}`);
  console.log("  android/app/src/main/res/mipmap-*/ic_launcher*.webp");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
