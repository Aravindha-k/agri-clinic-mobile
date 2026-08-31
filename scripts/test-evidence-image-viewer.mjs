/**
 * Regression: full-screen evidence image viewer interactions and wiring.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

test("EvidenceImageViewer supports pinch, pan, double-tap, reset, swipe, counter", () => {
  const viewer = read("src/components/visit/EvidenceImageViewer.tsx");
  assert.match(viewer, /Gesture\.Pinch/);
  assert.match(viewer, /Gesture\.Pan/);
  assert.match(viewer, /numberOfTaps\(2\)/);
  assert.match(viewer, /scan-outline/);
  assert.match(viewer, /\/ \{safeImages\.length\}/);
  assert.match(viewer, /contentFit="contain"/);
  assert.match(viewer, /backgroundColor: "#000000"/);
  assert.match(viewer, /Image\.prefetch/);
  assert.match(viewer, /recyclingKey=\{uri\}/);
});

test("visit step 3 opens viewer from evidence thumbnails with multi-image list", () => {
  const step3 = read("mobile/app/visit/create-step3.tsx");
  assert.match(step3, /EvidenceImageViewer/);
  assert.match(step3, /setViewerOpen\(true\)/);
  assert.match(step3, /viewerImages/);
  assert.match(step3, /initialIndex=\{viewerIndex\}/);
});

test("AttachmentCard opens viewer for image attachments", () => {
  const card = read("src/components/visit/AttachmentCard.tsx");
  assert.match(card, /EvidenceImageViewer/);
  assert.match(card, /setViewerOpen\(true\)/);
});
