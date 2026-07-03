/**
 * Extracts splash assets from storyboard (summary.avif or storyboard-reference.png).
 * Layout: 3×3 grid (high-res) or 1×9 column (mobile reference strip).
 * Run: node scripts/import-splash-storyboard.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const CANDIDATES = [
  path.join(root, "summary.avif"),
  path.join(root, "assets/splash/storyboard-reference.png"),
  path.join(
    root,
    "assets/c__Users_siddh_AppData_Roaming_Cursor_User_workspaceStorage_dca606e2f3fa4b60984e5a6846b53e82_images_image-ad9d7007-62a8-4ccd-9767-4b620fd1eeec.png"
  )
];

const OUT = path.join(root, "assets/splash");

function detectLayout(width, height) {
  const ratio = height / width;
  if (ratio > 1.4 && height / width < 2.2 && height < 1200) {
    return { cols: 1, rows: 9 };
  }
  return { cols: 3, rows: 3 };
}

async function resolveSource() {
  for (const candidate of CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error("No storyboard source found (summary.avif or storyboard-reference.png)");
}

async function main() {
  const SOURCE = await resolveSource();
  console.log("Storyboard source:", SOURCE);

  await fs.mkdir(path.join(OUT, "items"), { recursive: true });
  await fs.mkdir(path.join(OUT, "panels"), { recursive: true });

  const meta = await sharp(SOURCE).metadata();
  const W = meta.width ?? 4873;
  const H = meta.height ?? 3249;
  const { cols, rows } = detectLayout(W, H);
  const PW = Math.floor(W / cols);
  const PH = Math.floor(H / rows);

  console.log(`Layout ${cols}×${rows} — panel ${PW}×${PH}`);

  const panelPaths = [];

  async function panel(col, row, name) {
    const file = path.join(OUT, "panels", name);
    await sharp(SOURCE)
      .extract({ left: col * PW, top: row * PH, width: PW, height: PH })
      .png()
      .toFile(file);
    panelPaths.push(file);
    return file;
  }

  const panelIndex = (col, row) => row * cols + col;

  if (cols === 3 && rows === 3) {
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        await panel(col, row, `panel-${panelIndex(col, row)}.png`);
      }
    }
  } else {
    for (let row = 0; row < 9; row += 1) {
      await panel(0, row, `panel-${row}.png`);
    }
  }

  const panel00 =
    cols === 3
      ? path.join(OUT, "panels/panel-0.png")
      : path.join(OUT, "panels/panel-0.png");
  const panel02 =
    cols === 3 ? path.join(OUT, "panels/panel-2.png") : path.join(OUT, "panels/panel-2.png");
  const panel03 =
    cols === 3 ? path.join(OUT, "panels/panel-3.png") : path.join(OUT, "panels/panel-3.png");
  const panel04 =
    cols === 3 ? path.join(OUT, "panels/panel-4.png") : path.join(OUT, "panels/panel-4.png");
  const panel06 =
    cols === 3 ? path.join(OUT, "panels/panel-6.png") : path.join(OUT, "panels/panel-6.png");
  const panel07 =
    cols === 3 ? path.join(OUT, "panels/panel-7.png") : path.join(OUT, "panels/panel-7.png");

  await sharp(panel00)
    .resize(1080, 1920, { fit: "cover", position: "top" })
    .jpeg({ quality: 92 })
    .toFile(path.join(OUT, "sky-background.jpg"));

  await sharp(panel03)
    .extract({
      left: 0,
      top: Math.floor(PH * 0.38),
      width: PW,
      height: Math.floor(PH * 0.62)
    })
    .resize(1080, 600, { fit: "cover", position: "bottom" })
    .png()
    .toFile(path.join(OUT, "product-pile.png"));

  await sharp(panel04)
    .resize(900, 600, { fit: "inside" })
    .png()
    .toFile(path.join(OUT, "golden-glow.png"));

  await sharp(panel06)
    .resize(1080, 1920, { fit: "cover", position: "center" })
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT, "frame-logo.jpg"));

  await sharp(panel07)
    .resize(1080, 1920, { fit: "cover", position: "center" })
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT, "frame-brand.jpg"));

  const pileMeta = await sharp(panel03).metadata();
  const pileW = pileMeta.width ?? PW;
  const pileH = pileMeta.height ?? PH;

  const crops = [
    { name: "leaf.png", left: 0.05, top: 0.06, w: 0.12, h: 0.14 },
    { name: "grain.png", left: 0.14, top: 0.1, w: 0.08, h: 0.1 },
    { name: "bottle-green.png", left: 0.2, top: 0.3, w: 0.18, h: 0.55 },
    { name: "bottle-spray.png", left: 0.36, top: 0.24, w: 0.16, h: 0.6 },
    { name: "packet-seeds.png", left: 0.5, top: 0.36, w: 0.2, h: 0.5 },
    { name: "jar-fertilizer.png", left: 0.64, top: 0.3, w: 0.18, h: 0.55 },
    { name: "packet-organic.png", left: 0.76, top: 0.38, w: 0.18, h: 0.48 }
  ];

  for (const crop of crops) {
    const left = Math.floor(pileW * crop.left);
    const top = Math.floor(pileH * crop.top);
    const width = Math.max(40, Math.floor(pileW * crop.w));
    const height = Math.max(40, Math.floor(pileH * crop.h));
    await sharp(panel03)
      .extract({ left, top, width, height })
      .resize({ width: Math.min(240, width), height: Math.min(320, height), fit: "inside" })
      .png()
      .toFile(path.join(OUT, "items", crop.name));
  }

  const fallMeta = await sharp(panel02).metadata();
  const fW = fallMeta.width ?? PW;
  const fH = fallMeta.height ?? PH;
  const fallCrops = [
    { name: "fall-leaf-a.png", left: 0.1, top: 0.15, w: 0.1, h: 0.12 },
    { name: "fall-grain-a.png", left: 0.24, top: 0.22, w: 0.07, h: 0.09 },
    { name: "fall-bottle-green.png", left: 0.38, top: 0.1, w: 0.14, h: 0.32 },
    { name: "fall-bottle-spray.png", left: 0.54, top: 0.08, w: 0.12, h: 0.34 },
    { name: "fall-packet.png", left: 0.7, top: 0.18, w: 0.14, h: 0.28 }
  ];

  for (const crop of fallCrops) {
    const left = Math.floor(fW * crop.left);
    const top = Math.floor(fH * crop.top);
    const width = Math.max(40, Math.floor(fW * crop.w));
    const height = Math.max(40, Math.floor(fH * crop.h));
    await sharp(panel02)
      .extract({ left, top, width, height })
      .resize({ width: Math.min(200, width), height: Math.min(280, height), fit: "inside" })
      .png()
      .toFile(path.join(OUT, "items", crop.name));
  }

  console.log("Splash assets written to assets/splash/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
