import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const approvedSource = path.join(root, "assets/brand/logo_icons.png");
const logoIcon = path.join(root, "assets/brand/logo_icon.png");
const legacy = path.join(root, "assets/brand/app_icon.png");
const foreground = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const background = path.join(root, "assets/brand/kac/adaptive_icon_background_1024.png");
const approvedSha = "614f95d93e99a397a18bbe1bcf0cbc92987600c5cb3a9d8a343f587999fc6e89";
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
/** Visible brand mark should fill most of the white squircle plate. */
const MIN_CONTENT_RATIO = 0.45;
const MAX_CONTENT_RATIO = 0.96;

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
  return { width: maxX - minX + 1, height: maxY - minY + 1 };
}

function assertContentRatio(bounds, size, name, tolerance = 0) {
  for (const dimension of [bounds.width, bounds.height]) {
    const ratio = dimension / size;
    assert.ok(
      ratio >= MIN_CONTENT_RATIO - tolerance && ratio <= MAX_CONTENT_RATIO + tolerance,
      `${name} content ratio ${ratio.toFixed(4)} must stay ${MIN_CONTENT_RATIO}-${MAX_CONTENT_RATIO}`
    );
  }
}

function assertNearWhiteCorner(rgba, name) {
  const [r, g, b, a] = rgba;
  assert.ok(a === 255, `${name} corner alpha must be opaque`);
  assert.ok(r >= 248 && g >= 248 && b >= 248, `${name} corner must be near-white; rgba=${rgba.join(",")}`);
}

const sourceDigest = crypto.createHash("sha256").update(await fs.readFile(approvedSource)).digest("hex");
assert.equal(sourceDigest, approvedSha, "launcher must use the approved logo_icons source");

const [legacyImage, foregroundImage, backgroundImage, logoIconImage] = await Promise.all([
  rgba(legacy),
  rgba(foreground),
  rgba(background),
  rgba(logoIcon)
]);
for (const image of [legacyImage, foregroundImage, backgroundImage, logoIconImage]) {
  assert.equal(image.info.width, 1024);
  assert.equal(image.info.height, 1024);
}

const isBrandInk = ([r, g, b, a]) => a > 8 && (r < 245 || g < 245 || b < 245);
assertContentRatio(contentBounds(logoIconImage, isBrandInk), logoIconImage.info.width, "logo_icon");
assertContentRatio(contentBounds(legacyImage, isBrandInk), legacyImage.info.width, "legacy");
assertContentRatio(contentBounds(foregroundImage, isBrandInk), foregroundImage.info.width, "adaptive");

for (const image of [legacyImage, foregroundImage, backgroundImage, logoIconImage]) {
  for (const [x, y] of [
    [0, 0],
    [1023, 0],
    [0, 1023],
    [1023, 1023]
  ]) {
    assertNearWhiteCorner(pixel(image.data, image.info.width, x, y), path.basename(String(image)));
  }
}

for (const [folder, size] of Object.entries(legacySizes)) {
  for (const filename of ["ic_launcher.webp", "ic_launcher_round.webp"]) {
    const file = path.join(androidRes, folder, filename);
    const image = await rgba(file);
    assert.equal(image.info.width, size, `${folder}/${filename} width`);
    assert.equal(image.info.height, size, `${folder}/${filename} height`);
    assertContentRatio(contentBounds(image, isBrandInk), size, `${folder}/${filename}`, 0.08);
    for (const [x, y] of [
      [0, 0],
      [size - 1, 0],
      [0, size - 1],
      [size - 1, size - 1]
    ]) {
      assertNearWhiteCorner(pixel(image.data, size, x, y), `${folder}/${filename}`);
    }
  }
}

for (const [folder, size] of Object.entries(foregroundSizes)) {
  const filename = "ic_launcher_foreground.webp";
  const image = await rgba(path.join(androidRes, folder, filename));
  assert.equal(image.info.width, size, `${folder}/${filename} width`);
  assert.equal(image.info.height, size, `${folder}/${filename} height`);
  assertContentRatio(contentBounds(image, isBrandInk), size, `${folder}/${filename}`, 0.08);
}

for (const filename of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  const xml = await fs.readFile(path.join(androidRes, "mipmap-anydpi-v26", filename), "utf8");
  assert.match(xml, /<adaptive-icon\b/, `${filename} must define an adaptive icon`);
  assert.match(xml, /<background android:drawable="@color\/iconBackground"\s*\/>/);
  assert.match(xml, /<foreground android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/);
}

const androidColors = await fs.readFile(path.join(androidRes, "values", "colors.xml"), "utf8");
assert.match(
  androidColors,
  /<color name="iconBackground">#FFFFFF<\/color>/i,
  "shipped adaptive icon background must be white"
);

const readme = await fs.readFile(path.join(root, "assets/brand/kac/README.md"), "utf8");
assert.match(readme, /adaptive background is opaque white/i, "launcher README must document white background");
assert.doesNotMatch(readme, /logo-green adaptive background/i, "launcher README must not describe a green background");

const brandConfig = await fs.readFile(path.join(root, "src/config/brand.config.js"), "utf8");
assert.match(brandConfig, /launcherAppName:\s*"Kavya Agri"/, "launcher label must remain unchanged");
assert.match(brandConfig, /iconBackgroundColor:\s*"#FFFFFF"/, "adaptive background config must be white");
assert.match(brandConfig, /logo_icons\.png/, "brand config must reference logo_icons source");

console.log("Launcher icon audit passed: logo_icons source, white plate, densities, adaptive XML, and label.");
