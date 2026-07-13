/**
 * Generates logo_splash.png and Android native splashscreen_logo mipmaps
 * from assets/brand/logo.png for expo-splash-screen / CI prebuild.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SOURCE = path.join(root, "assets/brand/logo.png");
const OUT = path.join(root, "assets/brand/logo_splash.png");
const ANDROID_RES = path.join(root, "android/app/src/main/res");

/** Expo splash logo drawable sizes (px) per density bucket. */
const SPLASH_LOGO_SIZES = {
  "drawable-mdpi": 288,
  "drawable-hdpi": 432,
  "drawable-xhdpi": 576,
  "drawable-xxhdpi": 864,
  "drawable-xxxhdpi": 1152
};

const size = 768;
const circleMask = Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
);

async function buildLogoSplash() {
  await sharp(SOURCE)
    .trim({ threshold: 12 })
    .resize(size, size, { fit: "cover", position: "centre" })
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toFile(OUT);
  console.log(`Wrote ${OUT}`);
}

async function writeAndroidSplashLogos() {
  for (const [folder, px] of Object.entries(SPLASH_LOGO_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    const outPath = path.join(dir, "splashscreen_logo.png");
    await sharp(OUT)
      .resize(px, px, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`Wrote ${path.relative(root, outPath)} (${px}px)`);
  }
}

await buildLogoSplash();
await writeAndroidSplashLogos();
