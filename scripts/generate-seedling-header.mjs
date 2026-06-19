/**
 * Builds the bundled Home header WebP from the seedling source photo.
 * Source: Unsplash — young seedlings in fertile soil (free license).
 * https://unsplash.com/photos/young-seedlings-sprout-from-fertile-soil-9J4A5INWb4I
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "mobile/assets/backgrounds/seedling-sunrise-source.jpg");
const headerOut = path.join(root, "mobile/assets/backgrounds/seedling-sunrise-header.webp");
const fullOut = path.join(root, "mobile/assets/backgrounds/seedling-sunrise-full.webp");
const downloadUrl = "https://unsplash.com/photos/9J4A5INWb4I/download?force=true&w=1920";

await fs.mkdir(path.dirname(headerOut), { recursive: true });

try {
  await fs.access(source);
} catch {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Failed to download seedling source (${res.status})`);
  await fs.writeFile(source, Buffer.from(await res.arrayBuffer()));
}

const headerInfo = await sharp(source)
  .resize(1800, 420, { fit: "cover", position: "centre" })
  .webp({ quality: 76 })
  .toFile(headerOut);

const fullInfo = await sharp(source)
  .resize(1440, 2560, { fit: "cover", position: "centre" })
  .webp({ quality: 78 })
  .toFile(fullOut);

console.log(`Wrote ${headerOut} (${Math.round(headerInfo.size / 1024)} KB)`);
console.log(`Wrote ${fullOut} (${Math.round(fullInfo.size / 1024)} KB)`);
