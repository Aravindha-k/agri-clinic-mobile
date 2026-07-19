/**
 * Writes circular company logo into Android native splash drawables.
 * Corners are transparent — no white square plate.
 * Native launch: Kavya emerald background + centered circular logo.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ANDROID_RES = path.join(root, "android/app/src/main/res");
const LOGO_SRC = path.join(root, "assets/brand/logo_circle_transparent.png");
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Android 12 splash animated-icon slot sizes (approx density buckets). */
const SPLASH_LOGO_SIZES = {
  "drawable-mdpi": 288,
  "drawable-hdpi": 432,
  "drawable-xhdpi": 576,
  "drawable-xxhdpi": 864,
  "drawable-xxxhdpi": 1152
};

function circleMaskSvg(size) {
  const c = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${c}" cy="${c}" r="${c}" fill="#fff"/></svg>`
  );
}

async function circularLogo(size) {
  const fitted = await sharp(LOGO_SRC)
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

async function writeAndroidSplashLogos() {
  for (const [folder, px] of Object.entries(SPLASH_LOGO_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    const outPath = path.join(dir, "splashscreen_logo.png");
    const buf = await circularLogo(px);
    await fs.writeFile(outPath, buf);
    console.log(`Wrote ${path.relative(root, outPath)} (circular logo ${px}px)`);
  }
}

async function writeSplashscreenIconXml() {
  const drawableDir = path.join(ANDROID_RES, "drawable");
  await fs.mkdir(drawableDir, { recursive: true });
  /**
   * Layer-list centers the circular logo inside the Android 12 splash icon slot.
   * Do NOT use the adaptive launcher (white-plate era) — logo only on emerald.
   */
  const iconXml = `<?xml version="1.0" encoding="utf-8"?>
<!-- Circular company logo for Android 12+ splash — no white plate. -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <bitmap
      android:gravity="center"
      android:src="@drawable/splashscreen_logo" />
  </item>
</layer-list>
`;
  await fs.writeFile(path.join(drawableDir, "splashscreen_icon.xml"), iconXml, "utf8");
  console.log("Wrote android/app/src/main/res/drawable/splashscreen_icon.xml");
}

await fs.access(LOGO_SRC);
const meta = await sharp(LOGO_SRC).metadata();
console.log(`logo_circle_transparent.png present (${meta.width}x${meta.height}) — circular splash artwork`);
await writeAndroidSplashLogos();
await writeSplashscreenIconXml();
