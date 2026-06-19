/**
 * Creates optimized local WebP header images from the existing field artwork.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "assets/splash/rice-field.png");
const outDir = path.join(root, "assets/backgrounds");

await fs.mkdir(outDir, { recursive: true });

await sharp(source)
  .resize(1600, 420, { fit: "cover", position: "centre" })
  .webp({ quality: 72 })
  .toFile(path.join(outDir, "home-header.webp"));

await sharp(source)
  .resize(1440, 2560, { fit: "cover", position: "attention" })
  .webp({ quality: 74 })
  .toFile(path.join(outDir, "login-forest.webp"));

console.log("Generated header backgrounds");
