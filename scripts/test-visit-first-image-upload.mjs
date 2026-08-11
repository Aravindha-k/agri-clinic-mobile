/**
 * Regression: first visit photo upload must update UI without a second upload.
 * Mirrors normalize/merge helpers and asserts Visit Detail wiring.
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

function asRecord(value) {
  return value && typeof value === "object" ? value : null;
}

function firstString(...candidates) {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function extractNestedFileUrl(row) {
  const direct = firstString(row.file_url, row.file, row.url, row.media_url, row.photo_url, row.photo);
  if (direct) return direct;
  const fileObj = asRecord(row.file);
  if (fileObj) return firstString(fileObj.url, fileObj.file_url, fileObj.path, fileObj.uri);
  return null;
}

function coerceAttachmentType(raw, mimeType, fileUrl) {
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (["image", "pdf", "audio", "text", "other"].includes(normalized)) return normalized;
  }
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (fileUrl && /\.(jpe?g|png|webp)(\?|$)/i.test(fileUrl)) return "image";
  return "other";
}

function normalizeVisitAttachment(raw) {
  const rootObj = asRecord(raw);
  if (!rootObj) return null;
  const nested =
    asRecord(rootObj.attachment) || asRecord(rootObj.data) || asRecord(rootObj.result) || rootObj;
  const id = Number(nested.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const mime_type = firstString(nested.mime_type, nested.mimeType, nested.content_type);
  const file_url = extractNestedFileUrl(nested) || extractNestedFileUrl(rootObj);
  return {
    id,
    attachment_type: coerceAttachmentType(nested.attachment_type ?? nested.type, mime_type, file_url),
    file_url,
    uploaded_at: firstString(nested.uploaded_at, nested.created_at) || "2026-01-01T00:00:00Z"
  };
}

function isDisplayableVisitImage(attachment) {
  return Boolean(attachment && attachment.attachment_type === "image" && attachment.file_url?.trim());
}

function mergeVisitAttachmentsById(existing, incoming) {
  const byId = new Map();
  for (const row of existing) byId.set(row.id, row);
  for (const row of incoming) byId.set(row.id, row);
  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.uploaded_at || 0).getTime();
    const tb = new Date(b.uploaded_at || 0).getTime();
    return tb - ta;
  });
}

/** Simulate uploadVisitPhoto merge: create response wins over stale empty list. */
function simulateUploadVisitPhoto(createPayload, listedRows) {
  const created = normalizeVisitAttachment(createPayload);
  const createdImage = isDisplayableVisitImage(created) ? created : null;
  const listed = listedRows
    .map(normalizeVisitAttachment)
    .filter(isDisplayableVisitImage);
  if (createdImage) return mergeVisitAttachmentsById(listed, [createdImage]);
  if (listed.length > 0) return listed;
  throw new Error("Upload may have succeeded, but the photo is not available yet.");
}

test("normalize maps file/url aliases and nested attachment envelopes", () => {
  const fromFileAlias = normalizeVisitAttachment({
    id: 11,
    attachment_type: "image",
    file: "/media/visits/11.jpg"
  });
  assert.equal(fromFileAlias.file_url, "/media/visits/11.jpg");
  assert.equal(fromFileAlias.attachment_type, "image");

  const nested = normalizeVisitAttachment({
    success: true,
    data: { id: 12, type: "IMAGE", url: "https://cdn.example/a.png", mime_type: "image/png" }
  });
  assert.equal(nested.id, 12);
  assert.equal(nested.file_url, "https://cdn.example/a.png");
  assert.equal(nested.attachment_type, "image");
});

test("first upload uses create response even when list refetch is stale/empty", () => {
  const next = simulateUploadVisitPhoto(
    { id: 101, attachment_type: "image", file_url: "/media/first.jpg" },
    [] // stale GET dedupe / empty list
  );
  assert.equal(next.length, 1);
  assert.equal(next[0].id, 101);
  assert.equal(next[0].file_url, "/media/first.jpg");
});

test("second upload not required — merge keeps first + second", () => {
  const afterFirst = simulateUploadVisitPhoto(
    { id: 101, attachment_type: "image", file_url: "/media/first.jpg" },
    []
  );
  const afterSecond = simulateUploadVisitPhoto(
    { id: 102, attachment_type: "image", file_url: "/media/second.jpg" },
    afterFirst
  );
  assert.equal(afterSecond.length, 2);
  assert.ok(afterSecond.some((row) => row.id === 101));
  assert.ok(afterSecond.some((row) => row.id === 102));
});

test("replacing/updating same id keeps a single row with newer URL", () => {
  const merged = mergeVisitAttachmentsById(
    [{ id: 5, attachment_type: "image", file_url: "/media/old.jpg", uploaded_at: "2026-01-01T00:00:00Z" }],
    [{ id: 5, attachment_type: "image", file_url: "/media/new.jpg", uploaded_at: "2026-01-02T00:00:00Z" }]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].file_url, "/media/new.jpg");
});

test("uploadVisitPhoto / Visit Detail wiring uses create merge + dedupe:false", () => {
  const api = read("src/api/visitAttachments.ts");
  assert.match(api, /export function normalizeVisitAttachment/);
  assert.match(api, /export function mergeVisitAttachmentsById/);
  assert.match(api, /dedupe:\s*options\?\.dedupe/);

  const detail = read("mobile/lib/visitDetailApi.ts");
  assert.match(detail, /mergeVisitAttachmentsById/);
  assert.match(detail, /isDisplayableVisitImage/);
  assert.match(detail, /fetchVisitGallery/);
  assert.match(detail, /createdImage/);
  assert.match(detail, /mobile\/visits\/\$\{visitId\}\/media\//);
  assert.doesNotMatch(detail, /admin\/visits\/\$\{/);
  // Must not blind-replace UI solely from filtered refetch after discarding create body.
  assert.doesNotMatch(
    detail,
    /await postVisitMedia\(pk, photo\);\s*return fetchVisitAttachments\(pk\);/
  );

  const screen = read("mobile/app/visit/[id].tsx");
  assert.match(screen, /uploadVisitPhoto\(visit\.id, photo\)/);
  assert.match(screen, /setAttachments\(\[\.\.\.next\]\)/);
  assert.match(screen, /fetchVisitGallery/);
  assert.doesNotMatch(screen, /admin\/visits\//);
});

test("Visit Detail gallery reads media_files / media.images, not admin attachments", () => {
  const gallery = require("../src/utils/visitGalleryMedia.js");
  const fromFiles = gallery.extractVisitGalleryMedia({
    media_files: [{ id: 7, file_url: "/media/visit_media/one.jpg" }]
  });
  assert.equal(fromFiles.length, 1);
  assert.equal(fromFiles[0].file_url, "/media/visit_media/one.jpg");

  const fromNested = gallery.extractVisitGalleryMedia({
    media: { images: ["/media/visit_media/two.jpg"] }
  });
  assert.equal(fromNested.length, 1);
  assert.equal(fromNested[0].file_url, "/media/visit_media/two.jpg");

  const both = gallery.extractVisitGalleryMedia({
    media_files: [{ id: 1, url: "/media/visit_media/a.jpg" }],
    media: { images: [{ id: 1, file: "/media/visit_media/a.jpg" }] }
  });
  assert.equal(both.length, 1);

  assert.equal(gallery.visitHasCanonicalGallery({ media_files: [] }), true);
  assert.equal(gallery.visitHasCanonicalGallery({ observation: "x" }), false);

  const api = read("mobile/lib/visitDetailApi.ts");
  assert.match(api, /extractVisitGalleryMedia/);
  assert.match(api, /visitHasCanonicalGallery/);
  assert.doesNotMatch(api, /["'`]admin\/visits\//);
});

test("useVisitAttachments prepends create response immediately", () => {
  const hook = read("src/hooks/useVisitAttachments.ts");
  assert.match(hook, /setAttachments\(\(prev\) => \[created, \.\.\.prev\.filter/);
  assert.match(hook, /listVisitAttachments\(visitId,\s*\{\s*dedupe:\s*false\s*\}\)/);
});

test("farmer photo shows optimistic local URI before remote URL", () => {
  const avatar = read("mobile/components/farmers/FarmerPhotoAvatar.tsx");
  assert.match(avatar, /setLocalUrl\(picked\.uri\)/);
  assert.match(avatar, /refreshFarmer/);

  const picker = read("src/components/FarmerPhotoPicker.tsx");
  assert.match(picker, /setLocalUrl\(picked\.uri\)/);
  assert.match(picker, /refreshFarmer/);
});

test("session replacement still handled on attachment upload path", () => {
  const api = read("src/api/visitAttachments.ts");
  assert.match(api, /isDeviceSessionConflictPayload/);
  assert.match(api, /handleDeviceSessionConflict/);
  assert.match(api, /SESSION_REPLACED_MESSAGE/);
});
