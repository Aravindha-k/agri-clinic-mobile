import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "tmp");
const output = path.join(outDir, "launcher-icon-preview.png");
const foreground = path.join(root, "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp");
const legacy = path.join(root, "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp");
const iconBackground = "#0F6B43";

function svgMask(kind, size) {
  if (kind === "circle") {
    return Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  }
  if (kind === "squircle") {
    return Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.22}" ry="${size * 0.22}" fill="#fff"/></svg>`);
  }
  return Buffer.from(`<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.16}" ry="${size * 0.16}" fill="#fff"/></svg>`);
}

async function adaptiveIcon(kind, size) {
  const fg = await sharp(foreground)
    .resize(size, size, { fit: "contain", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  const icon = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: iconBackground
    }
  })
    .composite([{ input: fg, left: 0, top: 0 }])
    .png()
    .toBuffer();

  return sharp(icon)
    .composite([{ input: svgMask(kind, size), blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function label(text, width) {
  return sharp(
    Buffer.from(
      `<svg width="${width}" height="36"><style>text{font-family:Arial,sans-serif;font-size:18px;font-weight:500;fill:#222}</style><text x="${width / 2}" y="23" text-anchor="middle">${text}</text></svg>`
    )
  )
    .png()
    .toBuffer();
}

await fs.mkdir(outDir, { recursive: true });

const size = 96;
const gap = 34;
const panelW = size * 4 + gap * 5;
const panelH = 150;

const icons = [
  { name: "Pixel", image: await adaptiveIcon("circle", size) },
  { name: "Samsung", image: await adaptiveIcon("squircle", size) },
  { name: "MIUI", image: await adaptiveIcon("rounded", size) },
  { name: "Legacy", image: await sharp(legacy).resize(size, size).png().toBuffer() }
];

const composites = [];
for (const [index, item] of icons.entries()) {
  const left = gap + index * (size + gap);
  composites.push({ input: item.image, left, top: 12 });
  composites.push({ input: await label(item.name, size), left, top: 112 });
}

await sharp({
  create: {
    width: panelW,
    height: panelH,
    channels: 4,
    background: "#F7F8FA"
  }
})
  .composite(composites)
  .png()
  .toFile(output);

console.log(path.relative(root, output));
