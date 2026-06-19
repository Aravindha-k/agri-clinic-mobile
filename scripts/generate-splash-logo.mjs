/**
 * Crops logo.png to a circle so the white square padding is transparent on splash.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SOURCE = path.join(root, "assets/brand/logo.png");
const OUT = path.join(root, "assets/brand/logo-splash.png");

const size = 768;
const circleMask = Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
);

await sharp(SOURCE)
  .trim({ threshold: 12 })
  .resize(size, size, { fit: "cover", position: "centre" })
  .composite([{ input: circleMask, blend: "dest-in" }])
  .png()
  .toFile(OUT);

console.log(`Wrote ${OUT}`);
