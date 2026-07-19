import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const store = read("mobile/store/visitFormStore.ts");
const shell = read("mobile/app/visit/index.tsx");
const review = read("mobile/app/visit/create-step4-review.tsx");
const submitCoordinator = read("mobile/lib/visit/visitSubmitCoordinator.ts");
const beginNewVisit = read("mobile/lib/beginNewVisit.ts");
const validation = read("src/visit/visitValidation.ts");
const queue = read("mobile/lib/sync/offlineSyncManager.ts");
const pendingDetail = read("mobile/components/visits/PendingVisitDetail.tsx");
const notifier = read("mobile/lib/sync/syncQueueNotifier.ts");
const coordinator = read("mobile/lib/sync/automaticSyncCoordinator.ts");
const syncOrchestrator = read("mobile/lib/sync/syncOrchestrator.ts");
const pendingQueue = read("mobile/lib/pendingVisitsQueue.ts");
const queueIds = read("mobile/lib/sync/queueIds.ts");
const evidenceQueue = read("mobile/lib/sync/pendingEvidenceQueue.ts");
const success = read("mobile/app/visit/success.tsx");
const mapCard = read("mobile/components/duty/DutyMapCard.tsx");
const dutyContext = read("src/features/duty/store/DutyContext.tsx");
const visitRefresh = read("mobile/lib/visit/visitDataRefresh.ts");
const logoutGuard = read("mobile/lib/sync/logoutGuard.ts");
const en = read("src/i18n/en.ts");
const ta = read("src/i18n/ta.ts");

assert.match(store, /persist\(/, "visit draft must use Zustand persistence");
assert.match(store, /user_\$\{userId\}/, "draft key must be scoped to the active user");
assert.match(store, /skipHydration:\s*true/, "draft restore must be explicitly sequenced");
assert.match(store, /submissionLocalSyncId/, "stable submit identity must survive draft restore");
assert.match(store, /ensureLocalSyncId/, "draft must create one local_sync_id at start");
assert.match(store, /visitedAt/, "draft must track visited_at");
assert.match(beginNewVisit, /ensureLocalSyncId\(\)/, "new draft must mint local_sync_id once");
assert.match(beginNewVisit, /discardMedia/, "discard must clean temporary media");

assert.match(shell, /addListener\("beforeRemove"/, "all stack removal must share one draft guard");
assert.match(shell, /saveDraft/);
assert.match(shell, /continueEditing/);
assert.match(shell, /isVisitSubmitInFlight/, "guard must block while submit is in flight");
assert.match(shell, /beginNewVisit\(\{\s*discardMedia:\s*true\s*\}\)/, "discard must reset before leaving");

assert.match(review, /submitVisitCoordinator/);
assert.match(review, /resolveVisitReviewFarmer/);
assert.match(review, /fieldNotes/);
assert.match(review, /evidenceOptional/);
assert.match(review, /captureVisitGps/);
assert.match(review, /gpsGettingLocation/);
assert.doesNotMatch(review, /observationOptional/);
assert.doesNotMatch(review, /recommendationOptional/);
assert.doesNotMatch(review, /submitInFlightRef/, "screen must not own submit single-flight");

assert.match(submitCoordinator, /if \(submitInFlight\) return submitInFlight/);
assert.match(submitCoordinator, /enqueueFailedVisitEvidence/);
assert.match(submitCoordinator, /emitVisitDataRefresh/);
assert.match(submitCoordinator, /beginNewVisit\(\)/);

assert.doesNotMatch(
  validation.slice(validation.indexOf("export function getSubmitIssues")),
  /hasObservation\(/,
  "active submit validation must not require optional observation"
);

assert.match(queue, /queue\.some\(\(row\) => row\.local_sync_id === id\)/, "offline enqueue must dedupe");
assert.match(queue, /retryVisitFromQueue/);
assert.match(queue, /enqueueFailedVisitEvidence/, "visit success + media failure must queue media only");
assert.match(syncOrchestrator, /emitVisitDataRefresh/);
assert.match(dutyContext, /subscribeVisitDataRefresh/);
assert.match(visitRefresh, /emitVisitDataRefresh/);

assert.match(pendingDetail, /lastError/);
assert.match(pendingDetail, /removePendingVisit/);
assert.match(pendingDetail, /runAutomaticSync/);
assert.match(pendingDetail, /deletePendingSyncingBlocked/, "delete must guard syncing rows");
assert.match(
  pendingDetail,
  /try\s*\{[\s\S]*await runAutomaticSync[\s\S]*\}\s*finally\s*\{\s*setRetrying\(false\)/,
  "pending retry state must clear after success or failure"
);

assert.match(pendingQueue, /persistPendingAttachmentAsset/);
assert.match(pendingQueue, /export \{ generateLocalSyncId \} from "\.\/sync\/queueIds"/);
assert.match(queueIds, /export function generateLocalSyncId/);
assert.match(
  pendingQueue,
  /catch \(err\) \{\s*await Promise\.all\(persistedUris\.map\(\(uri\) => deletePersistedPhoto\(uri\)\)\)/,
  "offline queue insertion failure must roll back persisted media"
);
assert.match(evidenceQueue, /attachments:\s*PendingVisitAttachment\[\]/);
assert.match(evidenceQueue, /uploadAllPendingAttachments/);

assert.match(success, /mediaPendingTitle/);
assert.match(success, /viewPendingVisits/);
assert.match(success, /goToday/);
assert.match(mapCard, /pending-\$\{visit\.local_sync_id\}/);
assert.match(mapCard, /onPendingMarkerPress/);
assert.match(logoutGuard, /unsaved_visit/);

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
  "uploadsQueuedForRetry",
  "mediaPendingTitle",
  "deletePendingSyncingBlocked"
]) {
  assert.match(en, new RegExp(`${key}:`), `English key missing: ${key}`);
}

assert.match(en, /leaveVisitTitle:\s*"Unsaved visit"/);
assert.match(ta, /leaveVisitTitle:/);
assert.match(ta, /saveDraft:/);
assert.match(ta, /continueEditing:/);
assert.match(ta, /optionalObservationHint:/);
assert.match(ta, /pendingVisitDetails:/);
assert.match(ta, /deletePendingTitle:/);
assert.match(ta, /goToday:/);
assert.match(ta, /fieldLocation:/);
assert.match(ta, /photoLimitReached:/);
assert.match(ta, /uploadsQueuedForRetry:/);

console.log("V2 visit draft, guard, idempotency, pending-action, and i18n checks passed");
