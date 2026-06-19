/**
 * Login hero asset — full width, plant-forward crop for 52% cover band.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "login.jpg");
const out = path.join(root, "mobile/assets/backgrounds/login-backdrop.webp");

await fs.mkdir(path.dirname(out), { recursive: true });

/** Full width extract; attention crop favors plant over hand. */
const info = await sharp(source)
  .extract({ left: 0, top: 120, width: 1088, height: 920 })
  .resize(1080, 1240, { fit: "cover", position: "attention" })
  .webp({ quality: 86 })
  .toFile(out);

console.log(`Wrote ${out} (${Math.round(info.size / 1024)} KB, ${info.width}x${info.height})`);
