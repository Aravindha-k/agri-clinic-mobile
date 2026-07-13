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
const EMERALD_RGB = { r: 11, g: 61, b: 46 };
const KAC_DIR = path.join(root, "assets/brand/kac");
const SOURCE_SOLID = path.join(KAC_DIR, "app_icon_1024_solid.png");
const SOURCE_MONOGRAM = path.join(KAC_DIR, "monogram_transparent.png");
const OUT_MONOGRAM_CLEAN = path.join(KAC_DIR, "monogram_transparent.png");

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

async function stripNearWhiteCanvas(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];
    if (a === 0) continue;
    const isNearWhite = r > 235 && g > 235 && b > 235;
    const isPaperGray = r > 210 && g > 210 && b > 200 && Math.abs(r - g) < 24;
    const isEmeraldField = r < 40 && g > 40 && b < 70;
    if (isNearWhite || isPaperGray || isEmeraldField) {
      out[i + 3] = 0;
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function inspectForegroundAlpha(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let whiteOpaque = 0;
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 16) transparent += 1;
    else if (r > 235 && g > 235 && b > 235) whiteOpaque += 1;
  }
  return {
    file,
    transparentPct: (transparent / total) * 100,
    whiteOpaquePct: (whiteOpaque / total) * 100
  };
}

async function normalizeSolid1024() {
  await sharp(SOURCE_SOLID)
    .resize(1024, 1024, { fit: "cover" })
    .png()
    .toFile(OUT_APP_ICON);
  await fs.copyFile(OUT_APP_ICON, OUT_APP_ICON_1024);
}

async function buildAdaptiveForeground() {
  const cleanedMonogram = await stripNearWhiteCanvas(SOURCE_MONOGRAM);
  await sharp(cleanedMonogram).png().toFile(OUT_MONOGRAM_CLEAN);

  const monogram = await sharp(cleanedMonogram)
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

  const fgAudit = await inspectForegroundAlpha(OUT_ADAPTIVE_FG);
  console.log(
    `  foreground audit: transparent=${fgAudit.transparentPct.toFixed(1)}% whiteOpaque=${fgAudit.whiteOpaquePct.toFixed(1)}%`
  );
  if (fgAudit.whiteOpaquePct > 1) {
    throw new Error(
      `Adaptive foreground still contains ${fgAudit.whiteOpaquePct.toFixed(1)}% white pixels — white launcher halo risk`
    );
  }
  if (fgAudit.transparentPct < 50) {
    throw new Error("Adaptive foreground lacks sufficient transparency for emerald background layer");
  }

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
