import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const approved = path.join(root, "assets/brand/logo_icon.png");
const legacy = path.join(root, "assets/brand/app_icon.png");
const foreground = path.join(root, "assets/brand/adaptive_icon_foreground.png");
const background = path.join(root, "assets/brand/kac/adaptive_icon_background_1024.png");
const approvedSha = "2bd7a0ab02fa9535d94ee55b8d396bad4755fc05a88947cff4f48fe7f654af56";
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

function assertRatio(bounds, size, name) {
  for (const dimension of [bounds.width, bounds.height]) {
    const ratio = dimension / size;
    assert.ok(ratio >= 0.68 && ratio <= 0.74, `${name} content ratio ${ratio.toFixed(4)} must be 68–74%`);
  }
}

function assertShippedRatio(bounds, size, name) {
  for (const dimension of [bounds.width, bounds.height]) {
    const ratio = dimension / size;
    assert.ok(
      ratio >= 0.66 && ratio <= 0.77,
      `${name} rasterized content ratio ${ratio.toFixed(4)} must remain near the 68–74% master`
    );
  }
}

const sourceDigest = crypto.createHash("sha256").update(await fs.readFile(approved)).digest("hex");
assert.equal(sourceDigest, approvedSha, "launcher must use the approved original company logo");

const [legacyImage, foregroundImage, backgroundImage] = await Promise.all([
  rgba(legacy),
  rgba(foreground),
  rgba(background)
]);
for (const image of [legacyImage, foregroundImage, backgroundImage]) {
  assert.equal(image.info.width, 1024);
  assert.equal(image.info.height, 1024);
}

assertRatio(
  contentBounds(legacyImage, ([r, g, b]) => r < 245 || g < 245 || b < 245),
  legacyImage.info.width,
  "legacy"
);
assertRatio(
  contentBounds(foregroundImage, ([, , , a]) => a > 8),
  foregroundImage.info.width,
  "adaptive"
);

for (const image of [legacyImage, backgroundImage]) {
  for (const [x, y] of [[0, 0], [1023, 0], [0, 1023], [1023, 1023]]) {
    assert.deepEqual(pixel(image.data, image.info.width, x, y), [255, 255, 255, 255]);
  }
}

for (const [folder, size] of Object.entries(legacySizes)) {
  for (const filename of ["ic_launcher.webp", "ic_launcher_round.webp"]) {
    const file = path.join(androidRes, folder, filename);
    const image = await rgba(file);
    assert.equal(image.info.width, size, `${folder}/${filename} width`);
    assert.equal(image.info.height, size, `${folder}/${filename} height`);
    assertShippedRatio(
      contentBounds(image, ([r, g, b]) => r < 245 || g < 245 || b < 245),
      size,
      `${folder}/${filename}`
    );
    for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) {
      assert.deepEqual(pixel(image.data, size, x, y), [255, 255, 255, 255]);
    }
  }
}

for (const [folder, size] of Object.entries(foregroundSizes)) {
  const filename = "ic_launcher_foreground.webp";
  const image = await rgba(path.join(androidRes, folder, filename));
  assert.equal(image.info.width, size, `${folder}/${filename} width`);
  assert.equal(image.info.height, size, `${folder}/${filename} height`);
  assertShippedRatio(contentBounds(image, ([, , , a]) => a > 8), size, `${folder}/${filename}`);
}

for (const filename of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  const xml = await fs.readFile(path.join(androidRes, "mipmap-anydpi-v26", filename), "utf8");
  assert.match(xml, /<adaptive-icon\b/, `${filename} must define an adaptive icon`);
  assert.match(xml, /<background android:drawable="@color\/iconBackground"\s*\/>/);
  assert.match(xml, /<foreground android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/);
}

const androidColors = await fs.readFile(path.join(androidRes, "values/colors.xml"), "utf8");
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

console.log("Launcher icon audit passed: source, shipped densities, adaptive XML, white background, artwork ratio, and label.");
