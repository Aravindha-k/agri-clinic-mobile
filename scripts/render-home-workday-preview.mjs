import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tmp");
const output = path.join(outDir, "home-workday-working-preview.png");

await fs.mkdir(outDir, { recursive: true });

const svg = `<svg width="390" height="220" viewBox="0 0 390 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="220" rx="0" fill="#F6F8F5"/>
  <rect x="18" y="18" width="354" height="184" rx="18" fill="#FFFFFF" stroke="#DDE6DE"/>
  <text x="38" y="55" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#607062">Status</text>
  <rect x="282" y="36" width="70" height="30" rx="15" fill="#E7F5EA"/>
  <text x="317" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E7A3A">Working</text>
  <text x="38" y="99" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#607062">Started</text>
  <text x="352" y="99" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#17221B">09:15 AM</text>
  <text x="38" y="133" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#607062">Today's Work</text>
  <text x="352" y="133" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#17221B">Active</text>
  <text x="38" y="161" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1E7A3A">Location tracking active</text>
  <rect x="38" y="172" width="314" height="46" rx="12" fill="#0B5D3E"/>
  <text x="195" y="201" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">Open Tracking</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(output);
console.log(path.relative(root, output));
