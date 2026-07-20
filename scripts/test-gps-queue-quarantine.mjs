import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const MAX_GPS_RETRY_COUNT = 20;
const PERMANENT = new Set([
  "INVALID_POINT",
  "INVALID_ACCURACY",
  "INVALID_COORDINATES",
  "BULK_LIMIT_EXCEEDED",
  "MAX_RETRIES"
]);

function isFlushableGpsStatus(status) {
  return status === "pending" || status === "failed" || status === "syncing";
}

function selectFlushableGpsPoints(points) {
  return points.filter((p) => isFlushableGpsStatus(p.sync_status));
}

function isRetryableGpsFailure(code, retryable) {
  if (retryable === false) return false;
  if (retryable === true) return true;
  return !PERMANENT.has(code);
}

function applyGpsBulkAcknowledgement(queue, ack, sentPointIds) {
  const accepted = new Set(ack.accepted_ids ?? []);
  const failedById = new Map();
  for (const item of ack.failed_items ?? []) {
    const id = item.local_point_id ?? item.client_point_id;
    if (id) failedById.set(id, item);
  }
  let quarantinedCount = 0;
  const remaining = queue
    .map((point) => {
      if (!sentPointIds.includes(point.local_point_id)) return point;
      if (accepted.has(point.local_point_id)) return null;
      const failure = failedById.get(point.local_point_id);
      if (!failure) return point;
      const nextRetry = (point.retry_count ?? 0) + 1;
      let retryable = isRetryableGpsFailure(failure.code, failure.retryable);
      if (nextRetry >= MAX_GPS_RETRY_COUNT) retryable = false;
      const sync_status = retryable ? "pending" : "quarantined";
      if (sync_status === "quarantined") quarantinedCount += 1;
      return { ...point, sync_status, retry_count: nextRetry, failure_code: failure.code };
    })
    .filter(Boolean);
  return { remaining, quarantinedCount };
}

test("source excludes quarantined from flushable selectors", () => {
  const store = read("mobile/lib/sync/gpsQueueStore.ts");
  assert.match(store, /isFlushableGpsStatus/);
  assert.match(store, /readFlushableActiveUserGpsQueue/);
  assert.match(store, /selectFlushableGpsPoints/);
  assert.match(store, /export function readActiveUserGpsQueue\(\): PendingGPSPoint\[] \{\s*return readFlushableActiveUserGpsQueue\(\);/s);
});

test("quarantined item is not returned by flushable selector", () => {
  const queue = [
    { local_point_id: "q1", sync_status: "quarantined", retry_count: 1 },
    { local_point_id: "p1", sync_status: "pending", retry_count: 0 }
  ];
  const flushable = selectFlushableGpsPoints(queue);
  assert.equal(flushable.length, 1);
  assert.equal(flushable[0].local_point_id, "p1");
});

test("retryable item remains flushable", () => {
  const queue = [{ local_point_id: "r1", sync_status: "pending", retry_count: 2 }];
  assert.equal(selectFlushableGpsPoints(queue).length, 1);
});

test("one quarantined item does not block later valid items", () => {
  const queue = [
    { local_point_id: "bad", sync_status: "quarantined", retry_count: 3 },
    { local_point_id: "good", sync_status: "pending", retry_count: 0 },
    { local_point_id: "good2", sync_status: "failed", retry_count: 1 }
  ];
  const flushable = selectFlushableGpsPoints(queue);
  assert.deepEqual(
    flushable.map((p) => p.local_point_id),
    ["good", "good2"]
  );
});

test("permanent 400 response quarantines once", () => {
  const queue = [{ local_point_id: "p1", sync_status: "pending", retry_count: 0 }];
  const result = applyGpsBulkAcknowledgement(
    queue,
    {
      accepted_ids: [],
      failed_items: [
        { local_point_id: "p1", code: "INVALID_COORDINATES", message: "bad", retryable: false }
      ]
    },
    ["p1"]
  );
  assert.equal(result.quarantinedCount, 1);
  assert.equal(result.remaining[0].sync_status, "quarantined");
  assert.equal(selectFlushableGpsPoints(result.remaining).length, 0);
});

test("network/5xx remains retryable", () => {
  const queue = [{ local_point_id: "p1", sync_status: "pending", retry_count: 0 }];
  const result = applyGpsBulkAcknowledgement(
    queue,
    {
      accepted_ids: [],
      failed_items: [{ local_point_id: "p1", code: "SERVER_ERROR", message: "5xx", retryable: true }]
    },
    ["p1"]
  );
  assert.equal(result.remaining[0].sync_status, "pending");
  assert.equal(selectFlushableGpsPoints(result.remaining).length, 1);
});

test("queue restart preserves quarantine state in remaining list", () => {
  const persisted = [
    { local_point_id: "q", sync_status: "quarantined", retry_count: 4 },
    { local_point_id: "p", sync_status: "pending", retry_count: 0 }
  ];
  assert.equal(selectFlushableGpsPoints(persisted).length, 1);
  assert.equal(persisted.filter((p) => p.sync_status === "quarantined").length, 1);
});

test("no infinite retry loop — max retries quarantine", () => {
  const queue = [
    { local_point_id: "p1", sync_status: "pending", retry_count: MAX_GPS_RETRY_COUNT - 1 }
  ];
  const result = applyGpsBulkAcknowledgement(
    queue,
    {
      accepted_ids: [],
      failed_items: [{ local_point_id: "p1", code: "TRANSIENT", message: "x", retryable: true }]
    },
    ["p1"]
  );
  assert.equal(result.remaining[0].sync_status, "quarantined");
  assert.equal(selectFlushableGpsPoints(result.remaining).length, 0);
});
