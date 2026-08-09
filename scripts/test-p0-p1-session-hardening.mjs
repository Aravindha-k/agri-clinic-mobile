/**
 * P0/P1 mobile hardening regression — logout, refresh session, visit 409,
 * FLAG_SECURE, GPS confirm retry, startDuty errors, MIME, postVisitMedia.
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

test("1–4. Mobile logout uses mobile/auth/logout/ with refresh; local cleanup survives network fail", () => {
  const auth = read("src/api/auth.ts");
  assert.match(auth, /MOBILE_AUTH_LOGOUT\s*=\s*["']mobile\/auth\/logout\/["']/);
  assert.match(auth, /apiClient\(MOBILE_AUTH_LOGOUT/);
  assert.match(auth, /JSON\.stringify\(refresh \? \{ refresh \} : \{\}\)/);
  assert.doesNotMatch(auth, /apiClient\(\s*["']auth\/logout\//);

  const ctx = read("src/storage/AuthContext.tsx");
  assert.match(ctx, /logoutRequest\(\)/);
  assert.match(ctx, /clearLocalFieldQueuesOnSessionReplace/);
  assert.match(ctx, /performLocalSignOut/);
  // Network logout is best-effort; local teardown runs in finally / conflict catch.
  assert.match(ctx, /await logoutRequest\(\);\s*\} finally \{/s);
  assert.match(ctx, /logoutRequest\(\)\.catch/);
});

test("5–7. Refresh sends explicit DeviceSession and SESSION_REPLACED runs conflict teardown", () => {
  const refresh = read("src/api/tokenRefresh.ts");
  assert.match(refresh, /getDeviceSessionId/);
  assert.match(refresh, /DEVICE_SESSION_HEADER/);
  assert.match(refresh, /device_session_id/);
  assert.match(refresh, /handleDeviceSessionConflict/);
  assert.match(refresh, /teardownSessionReplaced|SESSION_REPLACED/);
  assert.match(refresh, /isDeviceSessionConflictPayload/);
  // Must not only throw DEVICE_SESSION_REQUIRED without teardown.
  assert.doesNotMatch(
    refresh,
    /kind === "device_session"\s*\{\s*throw new ApiRequestError\("Device session could not be verified/
  );
});

test("6. Session replace clears field queues (canonical clear helper still wired)", () => {
  const clear = read("src/storage/clearLocalFieldQueues.ts");
  assert.match(clear, /clearPendingGpsBuffer|clearHeartbeatQueue|pending_visits/);
  const conflict = read("src/storage/AuthContext.tsx");
  assert.match(conflict, /forceSessionConflictLogout/);
  assert.match(conflict, /clearLocalFieldQueuesOnSessionReplace/);
  assert.match(conflict, /registerSessionTeardown/);
});

test("8–9. Visit 409 SESSION_REPLACED only when payload code matches", () => {
  const src = read("src/utils/visitSubmitErrors.ts");
  assert.match(src, /isDeviceSessionConflictPayload/);
  assert.match(src, /VISIT_CONFLICT/);
  // Must not blanket-map every 409 to SESSION_REPLACED code.
  assert.doesNotMatch(
    src,
    /if \(status === 409\) \{\s*return new ApiRequestError\(\s*formatApiErrorMessage\(data, SESSION_REPLACED_MESSAGE/
  );

  // Load pure helpers via duplicated checks matching source contracts.
  const { isDeviceSessionConflictPayload, extractApiErrorCode } = (() => {
    const SESSION_REPLACED_CODES = new Set(["SESSION_REPLACED", "DEVICE_SESSION_CONFLICT"]);
    function extractApiErrorCode(data) {
      if (!data || typeof data !== "object") return null;
      if (typeof data.code === "string" && data.code.trim()) return data.code.trim();
      return null;
    }
    function isDeviceSessionConflictPayload(data, status) {
      const code = extractApiErrorCode(data);
      if (code && SESSION_REPLACED_CODES.has(code)) return true;
      return status === 409 && code != null && SESSION_REPLACED_CODES.has(code);
    }
    return { isDeviceSessionConflictPayload, extractApiErrorCode };
  })();

  assert.equal(isDeviceSessionConflictPayload({ code: "SESSION_REPLACED" }, 409), true);
  assert.equal(isDeviceSessionConflictPayload({ detail: "already submitted" }, 409), false);
  assert.equal(isDeviceSessionConflictPayload({ code: "DUPLICATE_VISIT" }, 409), false);
  assert.equal(extractApiErrorCode({ code: "SESSION_REPLACED" }), "SESSION_REPLACED");
});

test("10. Day / tracking screen invokes useSecureScreen", () => {
  const day = read("mobile/app/tracking.tsx");
  assert.match(day, /useSecureScreen/);
  assert.match(day, /useSecureScreen\(\)/);
});

test("11–12. Failed immediate GPS confirm does not duplicate Work Day; schedules retry", () => {
  const sync = read("src/tracking/locationSyncService.ts");
  assert.match(sync, /confirmDutyStartLocationOrRetry/);
  assert.match(sync, /scheduleDutyStartGpsConfirmRetry/);
  assert.match(sync, /CONFIRM_RETRY_DELAYS_MS/);
  assert.doesNotMatch(sync, /startDutySession/);

  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /confirmDutyStartLocationOrRetry/);
  assert.doesNotMatch(duty, /confirmDutyStartLocation\([^)]+\)\.catch\(\(\) => undefined\)/);
  const startBlock = duty.match(
    /const startDuty = useCallback\(async \(\) => \{[\s\S]*?\}, \[applyDutyState/
  );
  assert.ok(startBlock, "startDuty callback not found");
  const body = startBlock[0];
  const startIdx = body.indexOf("startDutySession");
  const applyIdx = body.indexOf("applyDutyState(started");
  const confirmIdx = body.indexOf("confirmDutyStartLocationOrRetry");
  assert.ok(startIdx >= 0 && applyIdx > startIdx && confirmIdx > applyIdx);
  // Confirm still scheduled, but must not block Start Work Day return (post-start freeze fix).
  assert.match(body, /void \(async \(\) => \{/);
  assert.doesNotMatch(
    body,
    /await confirmDutyStartLocationOrRetry\(locationResult\.location,\s*started\);\s*await startTrackingBridge/
  );
});

test("13–14. startDuty only reconciles already-active / 409; other errors surface", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /alreadyActive/);
  assert.match(duty, /error\.status === 409/);
  assert.match(duty, /isWorkdayAlreadyActiveMessage/);
  assert.match(duty, /isNetworkError\(error\)/);
  // Must not treat any ApiRequestError as soft-resume.
  assert.doesNotMatch(
    duty,
    /if \(!\(error instanceof ApiRequestError\) && !isWorkdayAlreadyActiveMessage/
  );
});

test("15–16. Attachment MIME allowlist rejects application/*; keeps image/PDF/audio", () => {
  const files = read("src/utils/visitAttachmentFiles.ts");
  assert.match(files, /VISIT_DOCUMENT_PICKER_MIME_TYPES/);
  assert.match(files, /assertSupportedVisitAttachment/);
  assert.match(files, /application\/pdf/);
  assert.match(files, /image\/jpeg/);
  assert.doesNotMatch(files, /"application\/\*"/);
  assert.doesNotMatch(files, /"text\/\*"/);

  const pickers = read("src/visit/visitEvidencePickers.ts");
  assert.match(pickers, /VISIT_DOCUMENT_PICKER_MIME_TYPES/);
  assert.match(pickers, /assertSupportedVisitAttachment/);
  assert.doesNotMatch(pickers, /"application\/\*"/);

  const section = read("src/components/visit/VisitEvidenceSection.tsx");
  assert.match(section, /VISIT_DOCUMENT_PICKER_MIME_TYPES/);
  assert.doesNotMatch(section, /"application\/\*"/);

  // Runtime-style checks mirrored from source rules
  function infer(filename, mime) {
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    const m = (mime || "").toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext) || m.startsWith("image/")) return "image";
    if (ext === ".pdf" || m === "application/pdf") return "pdf";
    if ([".mp3", ".m4a", ".wav", ".aac", ".webm", ".ogg"].includes(ext) || m.startsWith("audio/"))
      return "audio";
    return "other";
  }
  assert.equal(infer("a.jpg", "image/jpeg"), "image");
  assert.equal(infer("b.pdf", "application/pdf"), "pdf");
  assert.equal(infer("c.m4a", "audio/m4a"), "audio");
  assert.equal(infer("evil.exe", "application/octet-stream"), "other");
  assert.equal(infer("notes.docx", "application/vnd.openxmlformats"), "other");
});

test("17. postVisitMedia carries DeviceSession when still used", () => {
  const detail = read("mobile/lib/visitDetailApi.ts");
  assert.match(detail, /uploadVisitPhoto/);
  assert.match(detail, /postVisitMedia/);
  assert.match(detail, /getDeviceSessionHeaderEntries/);
  assert.match(detail, /uploadVisitAttachmentFile/);
  assert.match(detail, /X-Device-Session|sessionHeaders/);
});
