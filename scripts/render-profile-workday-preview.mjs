import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tmp");
const output = path.join(outDir, "profile-workday-orbit-preview.png");

await fs.mkdir(outDir, { recursive: true });

const svg = `<svg width="390" height="420" viewBox="0 0 390 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="390" height="420" fill="#F6F8F5"/>
  <rect x="0" y="0" width="390" height="226" fill="#FFFFFF"/>
  <text x="24" y="42" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="#17221B">Me</text>
  <circle cx="195" cy="118" r="76" fill="none" stroke="#B8D9C8" stroke-width="5"/>
  <circle cx="195" cy="118" r="76" fill="none" stroke="#D4B86A" stroke-width="2" stroke-dasharray="12 14"/>
  <circle cx="195" cy="26" r="15" fill="#FFFFFF" stroke="#0F6B43"/>
  <circle cx="287" cy="118" r="15" fill="#FFFFFF" stroke="#0F6B43"/>
  <circle cx="195" cy="210" r="15" fill="#FFFFFF" stroke="#0F6B43"/>
  <circle cx="103" cy="118" r="15" fill="#FFFFFF" stroke="#0F6B43"/>
  <circle cx="195" cy="118" r="58" fill="#E8F3EC" stroke="#0F6B43" stroke-width="2"/>
  <text x="195" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#005522">KAVYA</text>
  <text x="195" y="132" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#005522">AGRI CLINIC</text>
  <text x="195" y="256" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#17221B">Field Officer</text>
  <rect x="18" y="286" width="354" height="116" rx="18" fill="#FFFFFF" stroke="#DDE6DE"/>
  <text x="38" y="322" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#607062">Status</text>
  <text x="352" y="322" text-anchor="end" font-family="Arial, sans-serif" font-size="16" font-weight="800" fill="#0B5D3E">Working</text>
  <text x="38" y="352" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#607062">Timer</text>
  <text x="352" y="352" text-anchor="end" font-family="Arial, sans-serif" font-size="22" font-weight="800" fill="#17221B">01:24:08</text>
  <rect x="38" y="366" width="314" height="22" rx="11" fill="#F3F8F4"/>
  <text x="195" y="382" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0B5D3E">Start / End controls live only on Me</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(output);
console.log(path.relative(root, output));
