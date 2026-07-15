/**
 * Promotes assets/brand/logo_icons.png to all in-app + launcher icon slots.
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

const OUT = {
  logoIcon: path.join(root, "assets/brand/logo_icon.png"),
  logo: path.join(root, "assets/brand/logo.png"),
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

async function promoteLogoIcons() {
  const master = await sharp(SRC)
    .resize(SIZE, SIZE, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const adaptive = await sharp(master).ensureAlpha().png({ compressionLevel: 9 }).toBuffer();

  await fs.mkdir(path.join(root, "assets/brand/kac"), { recursive: true });
  await fs.writeFile(OUT.logoIcon, master);
  await fs.writeFile(OUT.logo, master);
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
        .resize(size, size, { fit: "cover" })
        .webp({ quality: 100, lossless: true })
        .toFile(path.join(dir, name));
    }
  }
  for (const [folder, size] of Object.entries(FG)) {
    const dir = path.join(androidRes, folder);
    await fs.mkdir(dir, { recursive: true });
    await sharp(adaptive)
      .resize(size, size, { fit: "cover" })
      .webp({ quality: 100, lossless: true })
      .toFile(path.join(dir, "ic_launcher_foreground.webp"));
  }

  for (const [kind, file] of [
    ["circle", "mask_preview_pixel_circle.png"],
    ["squircle", "mask_preview_samsung_squircle.png"],
    ["rounded", "mask_preview_miui_rounded.png"]
  ]) {
    await sharp(master)
      .composite([{ input: maskSvg(kind, SIZE), blend: "dest-in" }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(root, "assets/brand/kac", file));
  }

  await sharp(master).resize(48, 48).png().toFile(path.join(root, "assets/brand/kac/preview_48.png"));
  await sharp(master).resize(64, 64).png().toFile(path.join(root, "assets/brand/kac/preview_64.png"));

  const meta = await sharp(OUT.logoIcon).metadata();
  console.log(`Promoted logo_icons.png -> logo_icon/app_icon (${meta.width}x${meta.height})`);
}

export { promoteLogoIcons };

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  promoteLogoIcons().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
