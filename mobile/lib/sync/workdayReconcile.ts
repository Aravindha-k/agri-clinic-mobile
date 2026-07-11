import { fetchCurrentWorkday } from "../../../src/api/tracking";
import { isAuthExpiredError, isNetworkError } from "../../../src/utils/apiError";

export type WorkdayReconcileResult =
  | { ok: true; kind: "active" | "none" | "expired" }
  | { ok: false; reason: "network" | "auth_required" | "unknown" };

/** Lightweight workday reconcile for the sync pipeline — no React state updates. */
export async function reconcileWorkdayForSync(): Promise<WorkdayReconcileResult> {
  try {
    const result = await fetchCurrentWorkday();
    if (result.kind === "active") {
      return { ok: true, kind: "active" };
    }
    if (result.kind === "expired") {
      return { ok: true, kind: "expired" };
    }
    return { ok: true, kind: "none" };
  } catch (err) {
    if (isAuthExpiredError(err)) {
      return { ok: false, reason: "auth_required" };
    }
    if (isNetworkError(err)) {
      return { ok: false, reason: "network" };
    }
    return { ok: false, reason: "unknown" };
  }
}
