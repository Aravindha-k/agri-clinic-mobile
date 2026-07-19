/**
 * Asserts Android launcher icons use the canonical circular logo on Kavya green.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ADAPTIVE_CONTENT_RATIO, KAVYA_GREEN } from "./promote-logo-icons.mjs";

const root = path.resolve(import.meta.dirname, "..");
const approvedSource = path.join(root, "assets/brand/logo_circle_transparent.png");
const legacy = path.join(root, "assets/brand/app_icon.png");
const foreground = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const background = path.join(root, "assets/brand/kac/adaptive_icon_background_1024.png");
const androidRes = path.join(root, "android/app/src/main/res");
const legacySizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192
};
const foregroundSizes = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432
};

const GREEN = { r: 15, g: 107, b: 67 };

async function rgba(file) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function pixel(data, width, x, y) {
  const offset = (y * width + x) * 4;
  return [...data.subarray(offset, offset + 4)];
}

function contentBounds({ data, info }, predicate) {
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (!predicate(pixel(data, info.width, x, y))) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  assert.ok(maxX >= minX && maxY >= minY, "launcher artwork must contain visible logo pixels");
  return { width: maxX - minX + 1, height: maxY - minY + 1, minX, minY, maxX, maxY };
}

function assertNearGreenCorner(rgbaTuple, name) {
  const [r, g, b, a] = rgbaTuple;
  assert.ok(a === 255, `${name} corner alpha must be opaque`);
  assert.ok(
    Math.abs(r - GREEN.r) <= 8 && Math.abs(g - GREEN.g) <= 8 && Math.abs(b - GREEN.b) <= 8,
    `${name} corner must be Kavya green; rgba=${rgbaTuple.join(",")}`
  );
  assert.ok(!(r >= 248 && g >= 248 && b >= 248), `${name} must not be a white square plate`);
}

function assertTransparentCorner(rgbaTuple, name) {
  assert.equal(rgbaTuple[3], 0, `${name} adaptive corner must be transparent; rgba=${rgbaTuple.join(",")}`);
}

await fs.access(approvedSource);

const [legacyImage, foregroundImage, backgroundImage] = await Promise.all([
  rgba(legacy),
  rgba(foreground),
  rgba(background)
]);
for (const image of [legacyImage, foregroundImage, backgroundImage]) {
  assert.equal(image.info.width, 1024);
  assert.equal(image.info.height, 1024);
}

const isOpaque = ([, , , a]) => a > 8;
const fgBounds = contentBounds(foregroundImage, isOpaque);
const fgRatio = Math.max(fgBounds.width, fgBounds.height) / foregroundImage.info.width;
assert.ok(
  Math.abs(fgRatio - ADAPTIVE_CONTENT_RATIO) <= 0.04,
  `adaptive foreground content ratio ${fgRatio.toFixed(3)} must be ~${ADAPTIVE_CONTENT_RATIO}`
);
assert.ok(
  Math.abs(fgBounds.minX - (1024 - fgBounds.width) / 2) <= 4,
  "adaptive foreground artwork must be horizontally centered"
);

for (const [x, y] of [
  [0, 0],
  [1023, 0],
  [0, 1023],
  [1023, 1023]
]) {
  assertTransparentCorner(pixel(foregroundImage.data, 1024, x, y), "adaptive_icon_foreground");
}

for (const image of [legacyImage, backgroundImage]) {
  for (const [x, y] of [
    [0, 0],
    [1023, 0],
    [0, 1023],
    [1023, 1023]
  ]) {
    assertNearGreenCorner(pixel(image.data, image.info.width, x, y), "legacy/background");
  }
}

for (const [folder, size] of Object.entries(legacySizes)) {
  for (const filename of ["ic_launcher.webp", "ic_launcher_round.webp"]) {
    const file = path.join(androidRes, folder, filename);
    const image = await rgba(file);
    assert.equal(image.info.width, size);
    assert.equal(image.info.height, size);
    for (const [x, y] of [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
      [size - 1, size - 1]
    ]) {
      assertNearGreenCorner(pixel(image.data, size, x, y), `${folder}/${filename}`);
    }
  }
}

for (const [folder, size] of Object.entries(foregroundSizes)) {
  const filename = "ic_launcher_foreground.webp";
  const image = await rgba(path.join(androidRes, folder, filename));
  assert.equal(image.info.width, size);
  assert.equal(image.info.height, size);
  for (const [x, y] of [
    [0, 0],
    [size - 1, 0],
    [0, size - 1],
    [size - 1, size - 1]
  ]) {
    assertTransparentCorner(pixel(image.data, size, x, y), `${folder}/${filename}`);
  }
}

for (const filename of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  const xml = await fs.readFile(path.join(androidRes, "mipmap-anydpi-v26", filename), "utf8");
  assert.match(xml, /<adaptive-icon\b/);
  assert.match(xml, /@color\/iconBackground/);
  assert.match(xml, /@mipmap\/ic_launcher_foreground/);
}

const androidColors = await fs.readFile(path.join(androidRes, "values", "colors.xml"), "utf8");
assert.match(androidColors, new RegExp(`<color name="iconBackground">${KAVYA_GREEN}</color>`, "i"));

const brandConfig = await fs.readFile(path.join(root, "src/config/brand.config.js"), "utf8");
assert.match(brandConfig, /logo_circle_transparent\.png/);
assert.match(brandConfig, /iconBackgroundColor:\s*"#0F6B43"/);

const brandTs = await fs.readFile(path.join(root, "src/config/brand.ts"), "utf8");
assert.match(brandTs, /logo_circle_transparent\.png/);
assert.doesNotMatch(brandTs, /logo_icons\.png|logo_icon\.png|app_icon\.png|adaptive_icon/);

const splashAssets = await fs.readFile(path.join(root, "src/components/brand/splashAssets.ts"), "utf8");
assert.match(splashAssets, /logo_circle_transparent\.png/);

const styles = await fs.readFile(path.join(androidRes, "values", "styles.xml"), "utf8");
assert.doesNotMatch(styles, /icon_preferred/);

console.log(
  `Launcher icon audit passed: logo_circle_transparent.png, adaptive ${(ADAPTIVE_CONTENT_RATIO * 100).toFixed(0)}% inset, bg ${KAVYA_GREEN}.`
);
