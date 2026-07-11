import test from "node:test";
import assert from "node:assert/strict";

/**
 * Pure-function tests for offline sync acknowledgement logic.
 * Run: node --test scripts/test-offline-sync.mjs
 */

function isRetryableGpsFailure(code, retryable) {
  const permanent = new Set(["INVALID_POINT", "INVALID_ACCURACY", "INVALID_COORDINATES", "BULK_LIMIT_EXCEEDED"]);
  if (retryable === false) return false;
  if (retryable === true) return true;
  return !permanent.has(code);
}

function applyGpsBulkAcknowledgement(queue, ack, sentPointIds) {
  const accepted = new Set();
  if (ack.accepted_ids?.length) {
    for (const id of ack.accepted_ids) accepted.add(id);
  } else if (ack.failed_count === 0 && ack.success_count > 0) {
    for (const id of sentPointIds) accepted.add(id);
  }
  const failedById = new Map();
  for (const item of ack.failed_items ?? []) {
    const pointId = item.local_point_id ?? item.client_point_id;
    if (pointId) failedById.set(pointId, item);
  }
  let removedCount = 0;
  const remaining = queue
    .map((point) => {
      const pointId = point.local_point_id;
      const wasSent = sentPointIds.includes(pointId);
      if (!wasSent) return point;
      if (accepted.has(pointId)) {
        removedCount += 1;
        return null;
      }
      const failure = failedById.get(pointId);
      if (!failure) return point;
      const retryable = isRetryableGpsFailure(failure.code, failure.retryable);
      return {
        ...point,
        sync_status: retryable ? "pending" : "quarantined",
        retry_count: (point.retry_count ?? 0) + 1,
        last_error: failure.message
      };
    })
    .filter(Boolean);
  return { remaining, removedCount };
}

test("applyGpsBulkAcknowledgement removes only accepted ids", () => {
  const queue = [
    { local_point_id: "a", sync_status: "pending", retry_count: 0 },
    { local_point_id: "b", sync_status: "pending", retry_count: 0 }
  ];
  const result = applyGpsBulkAcknowledgement(
    queue,
    { success_count: 1, failed_count: 1, accepted_ids: ["a"], failed_items: [{ local_point_id: "b", code: "POINT_ERROR", message: "x", retryable: true }] },
    ["a", "b"]
  );
  assert.equal(result.removedCount, 1);
  assert.equal(result.remaining.length, 1);
  assert.equal(result.remaining[0].local_point_id, "b");
});

test("duty mismatch scenario retains all points when nothing accepted", () => {
  const queue = [{ local_point_id: "p1", sync_status: "pending", retry_count: 0 }];
  const result = applyGpsBulkAcknowledgement(
    queue,
    { success_count: 0, failed_count: 1, accepted_ids: [], failed_items: [{ local_point_id: "p1", code: "POINT_ERROR", message: "duty", retryable: true }] },
    ["p1"]
  );
  assert.equal(result.removedCount, 0);
  assert.equal(result.remaining.length, 1);
});

test("full success without accepted_ids uses sent list", () => {
  const queue = [
    { local_point_id: "x", sync_status: "pending", retry_count: 0 },
    { local_point_id: "y", sync_status: "pending", retry_count: 0 }
  ];
  const result = applyGpsBulkAcknowledgement(
    queue,
    { success_count: 2, failed_count: 0 },
    ["x", "y"]
  );
  assert.equal(result.removedCount, 2);
  assert.equal(result.remaining.length, 0);
});
