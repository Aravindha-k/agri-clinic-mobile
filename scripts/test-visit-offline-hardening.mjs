import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("one draft authority creates stable local_sync_id and scopes by user", () => {
  const store = read("mobile/store/visitFormStore.ts");
  const begin = read("mobile/lib/beginNewVisit.ts");
  assert.match(store, /ensureLocalSyncId/);
  assert.match(store, /generateLocalSyncId/);
  assert.match(store, /user_\$\{userId\}/);
  assert.match(begin, /ensureLocalSyncId\(\)/);
  assert.match(begin, /discardMedia/);
});

test("one submit coordinator owns online and offline submission", () => {
  const coordinator = read("mobile/lib/visit/visitSubmitCoordinator.ts");
  const review = read("mobile/app/visit/create-step4-review.tsx");
  assert.match(coordinator, /submitVisitCoordinator/);
  assert.match(coordinator, /if \(submitInFlight\) return submitInFlight/);
  assert.match(review, /submitVisitCoordinator/);
  assert.doesNotMatch(review, /enqueuePendingVisit\(/);
});

test("navigation guard covers stack removal without duplicate dialogs", () => {
  const shell = read("mobile/app/visit/index.tsx");
  assert.match(shell, /guardDialogOpen/);
  assert.match(shell, /isVisitSubmitInFlight/);
  assert.match(shell, /leaveVisitTitle/);
  assert.match(shell, /discardMedia:\s*true/);
});

test("optional field notes and evidence are accepted", () => {
  const validation = read("src/visit/visitValidation.ts");
  const review = read("mobile/app/visit/create-step4-review.tsx");
  const step3 = read("mobile/app/visit/create-step3.tsx");
  assert.doesNotMatch(
    validation.slice(validation.indexOf("export function getSubmitIssues")),
    /hasObservation\(/
  );
  assert.match(review, /fieldNotes/);
  assert.match(review, /noFieldNotes/);
  assert.match(review, /evidenceOptional/);
  assert.doesNotMatch(review, /observationOptional/);
  assert.match(step3, /fieldNotesHint/);
});

test("flush keeps visit success and queues only failed media", () => {
  const queue = read("mobile/lib/sync/offlineSyncManager.ts");
  assert.match(queue, /isDuplicateVisitResponse/);
  assert.match(queue, /enqueueFailedVisitEvidence/);
  assert.doesNotMatch(
    queue.slice(queue.indexOf("if (visitId > 0 && pendingAttachments?.length)"), queue.indexOf("writeVisitQueue(next)")),
    /throw new Error\(`Photo upload failed/
  );
});

test("pending delete is guarded while syncing", () => {
  const detail = read("mobile/components/visits/PendingVisitDetail.tsx");
  assert.match(detail, /status === "syncing"/);
  assert.match(detail, /deletePendingSyncingBlocked/);
});

test("map shows submitted visits only; pending drafts stay off the Day map", () => {
  const map = read("mobile/components/duty/DutyMapCard.tsx");
  const markers = read("src/features/duty/map/employeeDayMapMarkers.ts");
  assert.match(map, /buildEmployeeDayMapMarkers/);
  assert.doesNotMatch(map, /readPendingVisits/);
  assert.match(markers, /seenVisitKeys/);
  assert.match(markers, /marker\.pending !== true/);
  assert.match(map, /onPendingMarkerPress/);
});

test("central visit refresh refreshes duty map after sync", () => {
  const refresh = read("mobile/lib/visit/visitDataRefresh.ts");
  const orchestrator = read("mobile/lib/sync/syncOrchestrator.ts");
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(refresh, /emitVisitDataRefresh/);
  assert.match(orchestrator, /emitVisitDataRefresh/);
  assert.match(duty, /subscribeVisitDataRefresh/);
});

test("only one local_sync_id generator implementation remains", () => {
  const queueIds = read("mobile/lib/sync/queueIds.ts");
  const pending = read("mobile/lib/pendingVisitsQueue.ts");
  assert.match(queueIds, /export function generateLocalSyncId/);
  assert.match(pending, /export \{ generateLocalSyncId \} from "\.\/sync\/queueIds"/);
  assert.doesNotMatch(pending, /function generateLocalSyncId\(\)/);
});
