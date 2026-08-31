/**
 * Regression: visit watermark burn must not produce black/corrupt JPEGs.
 * Guards capture sizing, Image onLoad gate, compositor placement, MIME/path uniqueness.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

// Mirror of src/utils/watermarkCaptureLayout.ts for pure unit coverage.
function fitWatermarkCaptureSize(imageWidth, imageHeight, maxEdge = 1600) {
  const srcW = Math.max(1, Math.round(Number(imageWidth) || 1));
  const srcH = Math.max(1, Math.round(Number(imageHeight) || 1));
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  return {
    layoutWidth: width,
    layoutHeight: height,
    outputWidth: width,
    outputHeight: height
  };
}

test("fitWatermarkCaptureSize caps 4000px camera frames without PixelRatio blow-up", () => {
  const portrait = fitWatermarkCaptureSize(3024, 4032);
  assert.equal(portrait.layoutHeight, 1600);
  assert.equal(portrait.outputHeight, 1600);
  assert.ok(portrait.layoutWidth < 1600);
  assert.equal(portrait.layoutWidth, portrait.outputWidth);

  const landscape = fitWatermarkCaptureSize(4032, 3024);
  assert.equal(landscape.layoutWidth, 1600);
  assert.equal(landscape.outputWidth, 1600);

  const tiny = fitWatermarkCaptureSize(640, 480);
  assert.equal(tiny.layoutWidth, 640);
  assert.equal(tiny.layoutHeight, 480);
});

test("captureWatermarkedPhoto does not multiply Image.getSize by PixelRatio", () => {
  const src = read("src/utils/captureWatermarkedPhoto.ts");
  assert.doesNotMatch(src, /PixelRatio\.get\(\)/);
  assert.match(src, /fitWatermarkCaptureSize/);
  assert.match(src, /result:\s*"tmpfile"/);
  assert.match(src, /MIN_STAMPED_JPEG_BYTES/);
  assert.doesNotMatch(src, /width:\s*size\.outputWidth/);
  assert.doesNotMatch(src, /height:\s*size\.outputHeight/);
  assert.match(src, /if \(size\.outputWidth > UPLOAD_MAX_EDGE\)/);
});

test("EvidenceStampBurner waits for Image onLoad and stays in compositor", () => {
  const burner = read("mobile/components/visit/EvidenceStampBurner.tsx");
  assert.match(burner, /onLoad=\{\(\) => \{/);
  assert.match(burner, /imageLoadedRef\.current = true/);
  assert.match(burner, /evidenceCaptureHostStyle/);
  assert.match(burner, /opacity:\s*1/);
  assert.doesNotMatch(burner, /left:\s*-4000/);
  assert.doesNotMatch(burner, /setTimeout\(resolve,\s*80\)/);
  assert.match(burner, /fitEvidencePhotoCaptureSize/);
  assert.match(burner, /requestAnimationFrame/);
  assert.match(burner, /from "expo-image"/);
  assert.match(burner, /EvidencePhotoFooter/);
  assert.match(burner, /contentFit=\{EVIDENCE_PHOTO_CONTENT_FIT\}/);
});

test("VisitPhotoWatermarkPreview uses capped capture size and onLoad gate", () => {
  const preview = read("src/components/visit/VisitPhotoWatermarkPreview.tsx");
  assert.match(preview, /fitEvidencePhotoCaptureSize/);
  assert.match(preview, /captureImageReady/);
  assert.match(preview, /onLoad=\{\(\) => setCaptureImageReady\(true\)\}/);
  assert.doesNotMatch(preview, /left:\s*-9999/);
  assert.match(preview, /evidenceCaptureHostStyle/);
  assert.match(preview, /opacity:\s*1/);
  assert.doesNotMatch(preview, /PixelRatio/);
  assert.match(preview, /EvidencePhotoFooter/);
  assert.match(preview, /stampedPreviewUri/);
});

test("upload FormData uses processed uri with matching JPEG name and MIME", () => {
  const submit = read("mobile/lib/visitSubmitApi.ts");
  assert.match(submit, /formData\.append\("file",\s*\{/);
  assert.match(submit, /uri:\s*photo\.uri/);
  assert.match(submit, /name:\s*photo\.name/);
  assert.match(submit, /type:\s*photo\.mimeType/);

  const capture = read("mobile/lib/visitEvidenceCapture.ts");
  assert.match(capture, /mimeType:\s*"image\/jpeg"/);
  assert.match(capture, /Math\.random\(\)/);
  assert.doesNotMatch(capture, /ImageManipulator/);

  const files = read("src/utils/visitAttachmentFiles.ts");
  assert.match(files, /uniqueJpegUploadName/);
  assert.match(files, /mimeType:\s*"image\/jpeg"/);
  assert.match(files, /\.jpg/);

  const multipart = read("src/utils/multipartUpload.ts");
  assert.match(multipart, /uri:\s*file\.uri/);
  assert.match(multipart, /name:\s*file\.name/);
  assert.match(multipart, /type:\s*file\.mimeType/);
});

test("watermark layout helper module exports max edge constant", () => {
  const layout = read("src/utils/watermarkCaptureLayout.ts");
  assert.match(layout, /WATERMARK_CAPTURE_MAX_EDGE = 1600/);
  assert.match(layout, /export function fitWatermarkCaptureSize/);
  // Ensure TypeScript module is present for bundler resolution.
  assert.ok(layout.includes("CaptureLayoutSize"));
});
