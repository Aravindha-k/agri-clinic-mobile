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

test("mergeWorkdayStartedAt keeps earlier local start on re-login", () => {
  const local = "2026-07-13T03:30:00.000Z";
  const server = "2026-07-13T05:30:00.000Z";
  assert.equal(mergeWorkdayStartedAt(local, server), local);
});

test("start logout login preserves in_progress semantics", () => {
  const ref = new Date("2026-07-13T06:00:00.000Z");
  const record = {
    user_id: 7,
    work_date: "2026-07-13",
    status: "in_progress",
    started_at: "2026-07-13T03:30:00.000Z"
  };
  assert.equal(shouldRestoreWorkdayRecord(record, 7, ref), true);
  const elapsed = computeWorkdayElapsedMs({
    status: "in_progress",
    startedAt: record.started_at,
    now: ref.getTime()
  });
  assert.equal(elapsed, 2.5 * 60 * 60 * 1000);
});

test("different user login does not restore another users workday", () => {
  const record = {
    user_id: 7,
    work_date: getLocalWorkDate(),
    status: "in_progress",
    started_at: new Date().toISOString()
  };
  assert.equal(shouldRestoreWorkdayRecord(record, 9), false);
});

test("completed workday does not resume timer after restart", () => {
  const record = {
    user_id: 7,
    work_date: getLocalWorkDate(),
    status: "completed",
    started_at: "2026-07-13T03:30:00.000Z",
    total_work_duration_ms: 7200000
  };
  assert.equal(shouldRestoreWorkdayRecord(record, 7), true);
  const elapsed = computeWorkdayElapsedMs({
    status: "completed",
    startedAt: record.started_at,
    now: Date.now(),
    completedDurationMs: record.total_work_duration_ms
  });
  assert.equal(elapsed, 7200000);
});

test("server empty response should not erase valid local in_progress", () => {
  const record = {
    user_id: 3,
    work_date: getLocalWorkDate(),
    status: "in_progress",
    started_at: "2026-07-13T08:00:00.000Z"
  };
  const serverKind = "none";
  const keepLocal =
    serverKind === "none" && shouldRestoreWorkdayRecord(record, 3);
  assert.equal(keepLocal, true);
});
