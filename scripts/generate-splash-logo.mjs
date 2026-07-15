/**
 * Prefreshes transparent Android native splash drawables.
 * In-app / cinematic splash uses assets/brand/company_logo.png as-is (no redesign).
 * Android native launch remains background-only emerald (#0B3D2E).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ANDROID_RES = path.join(root, "android/app/src/main/res");
const COMPANY_LOGO = path.join(root, "assets/brand/company_logo.png");

/** Required by Expo/Android when styles reference @drawable/splashscreen_logo — keep fully transparent. */
const SPLASH_LOGO_SIZES = {
  "drawable-mdpi": 288,
  "drawable-hdpi": 432,
  "drawable-xhdpi": 576,
  "drawable-xxhdpi": 864,
  "drawable-xxxhdpi": 1152
};

/** 1x1 transparent PNG for invisible native splash artwork. */
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function writeTransparentAndroidSplashLogos() {
  for (const [folder, px] of Object.entries(SPLASH_LOGO_SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    await fs.mkdir(dir, { recursive: true });
    const outPath = path.join(dir, "splashscreen_logo.png");
    await sharp(TRANSPARENT_PNG)
      .resize(px, px, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`Wrote ${path.relative(root, outPath)} (transparent ${px}px)`);
  }
}

async function writeSplashscreenIconXml() {
  const drawableDir = path.join(ANDROID_RES, "drawable");
  await fs.mkdir(drawableDir, { recursive: true });
  const iconXml = `<?xml version="1.0" encoding="utf-8"?>
<!-- Invisible splash icon — native launch is background-only emerald. -->
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="@android:color/transparent" />
  <size android:width="1dp" android:height="1dp" />
</shape>
`;
  await fs.writeFile(path.join(drawableDir, "splashscreen_icon.xml"), iconXml, "utf8");
  console.log("Wrote android/app/src/main/res/drawable/splashscreen_icon.xml");
}

async function assertCompanyLogo() {
  await fs.access(COMPANY_LOGO);
  const meta = await sharp(COMPANY_LOGO).metadata();
  console.log(`company_logo.png present (${meta.width}x${meta.height}) — used as-is for splash/in-app`);
}

await assertCompanyLogo();
await writeTransparentAndroidSplashLogos();
await writeSplashscreenIconXml();
