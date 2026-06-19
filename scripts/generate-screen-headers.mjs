/**
 * Bundled screen header JPEGs from local home/work/visit artwork.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "mobile/assets/headers");

const HEADERS = [
  {
    source: "home.jpg",
    out: "home.jpg",
    /** Centre crop — sharp terraces/field, skip top/bottom bokeh blur. */
    preprocess: (img) =>
      img
        .rotate()
        .extract({ left: 280, top: 1380, width: 2896, height: 2100 })
        .resize(1280, 760, { fit: "cover", position: "centre" })
  },
  {
    source: "work.avif",
    out: "work.jpg",
    preprocess: (img) => img.resize(1280, 760, { fit: "cover", position: "centre" })
  },
  {
    source: "visit.avif",
    out: "visit.jpg",
    preprocess: (img) => img.resize(1280, 760, { fit: "cover", position: "centre" })
  },
  {
    source: "summary.avif",
    out: "summary.jpg",
    preprocess: (img) => img.resize(1280, 760, { fit: "cover", position: "centre" })
  }
];

await fs.mkdir(outDir, { recursive: true });

for (const item of HEADERS) {
  const pipeline = item.preprocess(sharp(path.join(root, item.source)));
  const info = await pipeline.jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(outDir, item.out));
  console.log(`Wrote ${item.out} (${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB)`);
}
