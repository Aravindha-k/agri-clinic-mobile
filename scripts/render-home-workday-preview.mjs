import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tmp");
const output = path.join(outDir, "home-no-workday-preview.png");

await fs.mkdir(outDir, { recursive: true });

const svg = `<svg width="390" height="260" viewBox="0 0 390 260" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="260" rx="0" fill="#F6F8F5"/>
  <text x="24" y="38" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#607062">Good morning</text>
  <text x="24" y="68" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="#17221B">Kavya Agri</text>
  <rect x="24" y="94" width="162" height="70" rx="14" fill="#FFFFFF" stroke="#DDE6DE"/>
  <text x="42" y="124" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#0B5D3E">12</text>
  <text x="42" y="149" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#607062">Visits today</text>
  <rect x="204" y="94" width="162" height="70" rx="14" fill="#FFFFFF" stroke="#DDE6DE"/>
  <text x="222" y="124" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#0B5D3E">8</text>
  <text x="222" y="149" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#607062">Farmers covered</text>
  <rect x="24" y="184" width="342" height="54" rx="14" fill="#FFFFFF" stroke="#DDE6DE"/>
  <text x="42" y="217" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#17221B">Recent activity</text>
  <text x="350" y="217" text-anchor="end" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0B5D3E">View all</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(output);
console.log(path.relative(root, output));
