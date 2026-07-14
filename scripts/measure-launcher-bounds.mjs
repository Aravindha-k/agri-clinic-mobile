import sharp from "sharp";

const EMERALD = { r: 11, g: 61, b: 46 };

const files = process.argv.slice(2);

function isEmerald(r, g, b) {
  return Math.abs(r - EMERALD.r) < 4 && Math.abs(g - EMERALD.g) < 4 && Math.abs(b - EMERALD.b) < 4;
}

for (const file of files) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let pixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a > 8 && !isEmerald(r, g, b)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        pixels += 1;
      }
    }
  }

  const width = maxX >= 0 ? maxX - minX + 1 : 0;
  const height = maxY >= 0 ? maxY - minY + 1 : 0;
  const fill = Math.round((Math.max(width, height) / info.width) * 1000) / 10;
  console.log(
    `${file}: ${info.width}x${info.height} bbox=${width}x${height} left=${minX} top=${minY} fill=${fill}% pixels=${pixels}`
  );
}
