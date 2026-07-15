import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const store = read("mobile/store/visitFormStore.ts");
const shell = read("mobile/app/visit/index.tsx");
const review = read("mobile/app/visit/create-step4-review.tsx");
const validation = read("src/visit/visitValidation.ts");
const queue = read("mobile/lib/sync/offlineSyncManager.ts");
const pendingDetail = read("mobile/components/visits/PendingVisitDetail.tsx");
const notifier = read("mobile/lib/sync/syncQueueNotifier.ts");
const coordinator = read("mobile/lib/sync/automaticSyncCoordinator.ts");
const pendingQueue = read("mobile/lib/pendingVisitsQueue.ts");
const evidenceQueue = read("mobile/lib/sync/pendingEvidenceQueue.ts");
const success = read("mobile/app/visit/success.tsx");
const en = read("src/i18n/en.ts");
const ta = read("src/i18n/ta.ts");

assert.match(store, /persist\(/, "visit draft must use Zustand persistence");
assert.match(store, /user_\$\{userId\}/, "draft key must be scoped to the active user");
assert.match(store, /skipHydration:\s*true/, "draft restore must be explicitly sequenced");
assert.match(store, /submissionLocalSyncId/, "stable submit identity must survive draft restore");
assert.match(shell, /addListener\("beforeRemove"/, "all stack removal must share one draft guard");
assert.match(shell, /saveDraft/);
assert.match(shell, /continueEditing/);
assert.match(shell, /beginNewVisit\(\);\s*navigation\.dispatch/, "discard must reset before leaving");
assert.match(review, /submissionLocalSyncId \?\? generateLocalSyncId\(\)/);
assert.match(review, /resolveVisitReviewFarmer/);
assert.ok(
  review.indexOf("submitInFlightRef.current = true") < review.indexOf("await startDay()"),
  "submit lock must be acquired before the first await"
);
assert.match(
  review,
  /finally\s*\{\s*submitInFlightRef\.current = false;\s*setSubmitting\(false\);/,
  "submit lock must be released by the outer finally"
);
assert.match(review, /failedAttachments:\s*PendingVisitAttachment\[\]/);
assert.match(review, /await enqueueFailedVisitEvidence\(/);
assert.doesNotMatch(
  validation.slice(validation.indexOf("export function getSubmitIssues")),
  /hasObservation\(/,
  "active submit validation must not require optional observation"
);
assert.match(queue, /queue\.some\(\(row\) => row\.local_sync_id === id\)/, "offline enqueue must dedupe");
assert.match(queue, /retryVisitFromQueue/);
assert.match(pendingDetail, /lastError/);
assert.match(pendingDetail, /removePendingVisit/);
assert.match(pendingDetail, /runAutomaticSync/);
assert.match(
  pendingDetail,
  /try\s*\{[\s\S]*await runAutomaticSync[\s\S]*\}\s*finally\s*\{\s*setRetrying\(false\)/,
  "pending retry state must clear after success or failure"
);
assert.match(pendingQueue, /persistPendingAttachmentAsset/);
assert.match(
  pendingQueue,
  /catch \(err\) \{\s*await Promise\.all\(persistedUris\.map\(\(uri\) => deletePersistedPhoto\(uri\)\)\)/,
  "offline queue insertion failure must roll back persisted media"
);
assert.match(evidenceQueue, /attachments:\s*PendingVisitAttachment\[\]/);
assert.match(evidenceQueue, /uploadAllPendingAttachments/);
assert.match(success, /usePremiumMotion/);
assert.match(success, /coreMotion\s*\?\s*withSequence/);
assert.match(notifier, /subscribeFieldQueueChanges/);
assert.match(coordinator, /emitFieldQueueChange\("sync_progress"\)/);
assert.match(
  coordinator,
  /if \(coordinatorInFlight\) \{\s*return coordinatorInFlight;/,
  "forced retries must still share the automatic-sync single flight"
);

for (const key of [
  "leaveVisitTitle",
  "saveDraft",
  "continueEditing",
  "optionalObservationHint",
  "pendingVisitDetails",
  "deletePendingTitle",
  "goToday",
  "fieldLocation",
  "photoLimitReached",
  "uploadsQueuedForRetry"
]) {
  assert.match(en, new RegExp(`${key}:`), `English key missing: ${key}`);
  assert.match(ta, new RegExp(`${key}:`), `Tamil key missing: ${key}`);
}

console.log("V2 visit draft, guard, idempotency, pending-action, and i18n checks passed");
