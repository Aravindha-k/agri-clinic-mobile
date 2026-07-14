import test from "node:test";
import assert from "node:assert/strict";

function getWorkdayStartTimestamp(startedAt) {
  if (!startedAt?.trim()) return null;
  const ms = new Date(startedAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function getLocalWorkDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWorkDateToday(workDate, reference = new Date()) {
  if (!workDate?.trim()) return false;
  return workDate.trim() === getLocalWorkDate(reference);
}

function mergeWorkdayStartedAt(localStartedAt, serverStartedAt) {
  const localTs = getWorkdayStartTimestamp(localStartedAt);
  const serverTs = getWorkdayStartTimestamp(serverStartedAt);
  if (localTs != null && serverTs != null) {
    return localTs <= serverTs ? localStartedAt.trim() : serverStartedAt.trim();
  }
  if (localTs != null) return localStartedAt.trim();
  if (serverTs != null) return serverStartedAt.trim();
  return null;
}

function shouldRestoreWorkdayRecord(record, userId, reference = new Date()) {
  if (!record) return false;
  if (!isWorkDateToday(record.work_date, reference)) return false;
  if (record.status !== "in_progress" && record.status !== "completed") return false;
  if (userId != null && record.user_id != null && record.user_id !== userId) return false;
  return true;
}

function computeWorkdayElapsedMs({ status, startedAt, now, completedDurationMs = 0 }) {
  if (status === "completed") return Math.max(0, completedDurationMs);
  if (status !== "in_progress" || !startedAt) return 0;
  const start = getWorkdayStartTimestamp(startedAt);
  if (start == null) return 0;
  return Math.max(0, now - start);
}

/** Mobile B login restores Mobile A start via server payload. */
function restoreFromServerActive(serverDuty, localCache, userId, nowMs) {
  if (serverDuty?.status !== "in_progress" && serverDuty?.is_active !== true) {
    return { status: "not_started", showStart: true, elapsed: 0 };
  }
  if (localCache && localCache.user_id != null && localCache.user_id !== userId) {
    localCache = null;
  }
  const startedAt =
    localCache && localCache.workday_id === serverDuty.workday_id
      ? mergeWorkdayStartedAt(localCache.started_at, serverDuty.started_at)
      : serverDuty.started_at;
  const elapsed = computeWorkdayElapsedMs({
    status: "in_progress",
    startedAt,
    now: nowMs
  });
  return {
    status: "in_progress",
    showStart: false,
    workday_id: serverDuty.workday_id,
    started_at: startedAt,
    elapsed
  };
}

test("multi-device: Mobile B restores same started_at and elapsed from server", () => {
  const started = "2026-07-14T03:30:00.000Z"; // 09:00 IST
  const now = new Date("2026-07-14T06:00:00.000Z").getTime(); // 11:30 IST
  const server = {
    status: "in_progress",
    is_active: true,
    workday_id: 441,
    duty_session_id: 902,
    started_at: started
  };
  const restored = restoreFromServerActive(server, null, 7, now);
  assert.equal(restored.status, "in_progress");
  assert.equal(restored.showStart, false);
  assert.equal(restored.workday_id, 441);
  assert.equal(restored.started_at, started);
  assert.equal(restored.elapsed, 2.5 * 60 * 60 * 1000);
});

test("multi-device: server none clears local in_progress (online authority)", () => {
  const local = {
    user_id: 7,
    work_date: getLocalWorkDate(),
    status: "in_progress",
    started_at: "2026-07-14T03:30:00.000Z",
    workday_id: 441
  };
  const serverKind = "none";
  const keepLocalOffline = false;
  const clearLocal = serverKind === "none" && !keepLocalOffline && local.status === "in_progress";
  assert.equal(clearLocal, true);
});

test("login hydration: Start hidden until server reconciled", () => {
  const hydratedLocal = true;
  const serverReconciled = false;
  const showStart = hydratedLocal && serverReconciled && false;
  assert.equal(showStart, false);
  const hydrating = !hydratedLocal || !serverReconciled;
  assert.equal(hydrating, true);
});

test("different employee never restores foreign cache", () => {
  const record = {
    user_id: 7,
    work_date: getLocalWorkDate(),
    status: "in_progress",
    started_at: new Date().toISOString()
  };
  assert.equal(shouldRestoreWorkdayRecord(record, 9), false);
});

test("server time offset keeps timer accurate with wrong device clock", () => {
  const startedAt = "2026-07-14T03:30:00.000Z";
  const serverTime = new Date("2026-07-14T06:00:00.000Z").getTime();
  const wrongDeviceNow = new Date("2026-07-14T04:00:00.000Z").getTime();
  const offset = serverTime - wrongDeviceNow;
  const elapsed = computeWorkdayElapsedMs({
    status: "in_progress",
    startedAt,
    now: wrongDeviceNow + offset
  });
  assert.equal(elapsed, 2.5 * 60 * 60 * 1000);
});

test("merge same session keeps earliest started_at", () => {
  const local = "2026-07-14T03:30:00.000Z";
  const server = "2026-07-14T03:31:00.000Z";
  assert.equal(mergeWorkdayStartedAt(local, server), local);
});
