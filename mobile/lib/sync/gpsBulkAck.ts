import type { GpsBulkAckPayload, GpsBulkFailedItem, PendingGPSPoint } from "./fieldQueueTypes";

const PERMANENT_FAILURE_CODES = new Set([
  "INVALID_POINT",
  "INVALID_ACCURACY",
  "INVALID_COORDINATES",
  "BULK_LIMIT_EXCEEDED"
]);

export function isRetryableGpsFailure(code: string, retryable?: boolean): boolean {
  if (retryable === false) return false;
  if (retryable === true) return true;
  return !PERMANENT_FAILURE_CODES.has(code);
}

export type GpsAckApplyResult = {
  remaining: PendingGPSPoint[];
  removedCount: number;
  failedCount: number;
  quarantinedCount: number;
};

/**
 * Apply bulk GPS acknowledgement — remove only explicitly accepted points.
 * Never clears the full queue on partial success.
 */
export function applyGpsBulkAcknowledgement(
  queue: PendingGPSPoint[],
  ack: GpsBulkAckPayload,
  sentPointIds: string[]
): GpsAckApplyResult {
  const accepted = new Set<string>();

  if (ack.accepted_ids?.length) {
    for (const id of ack.accepted_ids) {
      if (id) accepted.add(id);
    }
  } else if (ack.failed_count === 0 && ack.success_count > 0) {
    for (const id of sentPointIds) {
      accepted.add(id);
    }
  } else if (ack.failed_count === 0 && sentPointIds.length > 0) {
    for (const id of sentPointIds) {
      accepted.add(id);
    }
  }

  const failedById = new Map<string, GpsBulkFailedItem>();
  const failedByIndex = new Map<number, GpsBulkFailedItem>();

  for (const item of ack.failed_items ?? []) {
    const pointId = item.local_point_id ?? item.client_point_id;
    if (pointId) {
      failedById.set(pointId, item);
    }
    if (typeof item.index === "number") {
      failedByIndex.set(item.index, item);
    }
  }

  let removedCount = 0;
  let failedCount = 0;
  let quarantinedCount = 0;

  const remaining = queue.map((point, index) => {
    const pointId = point.local_point_id;
    const wasSent = sentPointIds.includes(pointId);

    if (!wasSent) {
      return point;
    }

    if (accepted.has(pointId)) {
      removedCount += 1;
      return null;
    }

    const failure = failedById.get(pointId) ?? failedByIndex.get(index);
    if (!failure) {
      return point;
    }

    failedCount += 1;
    const retryable = isRetryableGpsFailure(failure.code, failure.retryable);
    const nextRetry = (point.retry_count ?? 0) + 1;
    const nextStatus = retryable ? "pending" : "quarantined";
    if (nextStatus === "quarantined") {
      quarantinedCount += 1;
    }

    return {
      ...point,
      sync_status: nextStatus as PendingGPSPoint["sync_status"],
      retry_count: nextRetry,
      last_error: failure.message,
      failure_code: failure.code,
      updated_at: new Date().toISOString()
    };
  }).filter((row): row is PendingGPSPoint => row !== null);

  return { remaining, removedCount, failedCount, quarantinedCount };
}
