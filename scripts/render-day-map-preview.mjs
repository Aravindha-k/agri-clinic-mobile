import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tmp");
const output = path.join(outDir, "day-map-marker-only-preview.png");

await fs.mkdir(outDir, { recursive: true });

const svg = `<svg width="390" height="220" viewBox="0 0 390 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="220" fill="#F6F8F5"/>
  <rect x="18" y="18" width="354" height="184" rx="16" fill="#FFFFFF" stroke="#DDE6DE"/>
  <rect x="34" y="34" width="322" height="132" rx="12" fill="#E9F1EC"/>
  <path d="M34 82 C98 72 126 96 184 82 C244 68 278 78 356 64" fill="none" stroke="#DDE6DE" stroke-width="10"/>
  <path d="M34 137 C88 126 120 145 176 136 C236 126 286 140 356 128" fill="none" stroke="#DDE6DE" stroke-width="10"/>
  <circle cx="106" cy="112" r="11" fill="#0B5D3E" stroke="#FFFFFF" stroke-width="4"/>
  <text x="106" y="93" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#0B5D3E">Start</text>
  <circle cx="210" cy="78" r="9" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="4"/>
  <circle cx="276" cy="132" r="9" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="4"/>
  <circle cx="318" cy="86" r="9" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="4"/>
  <text x="34" y="190" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#607062">Marker-only Day summary: no GPS breadcrumb/polyline</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(output);
console.log(path.relative(root, output));
