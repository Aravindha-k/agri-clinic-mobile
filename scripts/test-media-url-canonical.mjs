/**
 * Mobile media URL consumption: relative + absolute, no /api/ prefix, no double host.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const require = createRequire(import.meta.url);

const { canonicalizeMediaUrl, sanitizeMediaPath } = require("../src/utils/canonicalizeMediaUrl.js");

const QA_ORIGIN = "http://13.207.17.117";

test("relative /media/ prefixes active origin and never /api/", () => {
  assert.equal(
    canonicalizeMediaUrl("/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("/media/visit_media/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/visit_media/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
});

test("absolute URL on same host is kept (protocol follows active origin)", () => {
  assert.equal(
    canonicalizeMediaUrl("http://13.207.17.117/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("http://13.207.17.117/media/visit_media/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/visit_media/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("https://13.207.17.117/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
});

test("null / empty / whitespace → null", () => {
  assert.equal(canonicalizeMediaUrl(null, QA_ORIGIN), null);
  assert.equal(canonicalizeMediaUrl(undefined, QA_ORIGIN), null);
  assert.equal(canonicalizeMediaUrl("   ", QA_ORIGIN), null);
});

test("encoded filename is preserved", () => {
  assert.equal(
    canonicalizeMediaUrl("/media/uploads/foo%20bar.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/foo%20bar.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("http://13.207.17.117/media/uploads/நாற்று.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/%E0%AE%A8%E0%AE%BE%E0%AE%B1%E0%AF%8D%E0%AE%B1%E0%AF%81.jpg"
  );
});

test("never produce /api/media or double host or double /media/", () => {
  assert.equal(
    canonicalizeMediaUrl("/api/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("/api/v1/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("http://13.207.17.117/api/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("http://13.207.17.117/http://13.207.17.117/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
  assert.equal(
    canonicalizeMediaUrl("/media/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
  assert.equal(sanitizeMediaPath("/api/v1/media/uploads/x.jpg"), "/media/uploads/x.jpg");
});

test("local optimistic file URI is not rewritten", () => {
  assert.equal(canonicalizeMediaUrl("file:///data/user/0/app/cache/photo.jpg", QA_ORIGIN), "file:///data/user/0/app/cache/photo.jpg");
  assert.equal(canonicalizeMediaUrl("content://media/external/images/1", QA_ORIGIN), "content://media/external/images/1");
});

test("LAN absolute media is rewritten onto the active origin", () => {
  assert.equal(
    canonicalizeMediaUrl("http://192.168.29.18:8000/media/uploads/x.jpg", QA_ORIGIN),
    "http://13.207.17.117/media/uploads/x.jpg"
  );
});

test("Visit Detail and farmer photo render through resolveMediaUrl / cacheBust", () => {
  const detail = read("mobile/app/visit/[id].tsx");
  assert.match(detail, /resolveMediaUrl\(a\.file_url\)/);
  assert.match(detail, /resolveMediaUrl\(attachment\.file_url\)/);
  assert.match(detail, /source=\{\{\s*uri\s*\}\}/);
  assert.match(detail, /source=\{\{\s*uri: imageUrls\[viewerIndex\]\s*\}\}/);

  const card = read("src/components/visit/AttachmentCard.tsx");
  assert.match(card, /resolveMediaUrl\(attachment\.file_url\)/);
  assert.match(card, /source=\{\{\s*uri: mediaUri\s*\}\}/);

  const farmer = read("mobile/components/farmers/FarmerPhotoAvatar.tsx");
  assert.match(farmer, /extractPhotoUrl\(farmer\)/);
  assert.match(farmer, /cacheBustPhotoUrl\(previewUri/);
  assert.match(farmer, /setLocalUrl\(picked\.uri\)/);
  assert.match(farmer, /setLocalUrl\(url\)/);

  const upload = read("mobile/lib/visitDetailApi.ts");
  assert.match(upload, /createdImage/);
  assert.match(upload, /mergeVisitAttachmentsById/);

  const list = read("src/api/visitAttachments.ts");
  assert.match(list, /normalizeVisitAttachment/);
  assert.match(list, /listVisitAttachments/);

  const helper = read("src/utils/resolveMediaUrl.ts");
  assert.match(helper, /canonicalizeMediaUrl/);
  assert.match(helper, /getMediaOrigin/);
  assert.doesNotMatch(helper, /API_BASE_URL\}media/);
});

test("cacheBust skips local URIs so first-upload preview stays file://", () => {
  const photo = read("src/utils/profilePhotoUrl.ts");
  assert.match(photo, /file\|content\|data\|blob/);
  assert.match(photo, /resolveMediaUrl\(url\)/);
});
