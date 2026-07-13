import test from "node:test";
import assert from "node:assert/strict";

function getLocalWorkDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function workDateFromIso(iso) {
  if (!iso?.trim()) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return getLocalWorkDate(new Date(ms));
}

function isSameLocalWorkDate(isoOrDate, reference = new Date()) {
  const workDate =
    typeof isoOrDate === "string" && isoOrDate.length === 10
      ? isoOrDate
      : workDateFromIso(isoOrDate);
  if (!workDate) return false;
  return workDate === getLocalWorkDate(reference);
}

function isWorkDateToday(workDate, reference = new Date()) {
  if (!workDate?.trim()) return false;
  return workDate.trim() === getLocalWorkDate(reference);
}

function formatWorkDurationMs(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

test("getLocalWorkDate returns YYYY-MM-DD", () => {
  const date = new Date(2026, 6, 13, 15, 30, 0);
  assert.equal(getLocalWorkDate(date), "2026-07-13");
});

test("workDateFromIso uses local calendar day", () => {
  const iso = new Date(2026, 6, 13, 23, 30, 0).toISOString();
  assert.equal(workDateFromIso(iso), "2026-07-13");
});

test("isSameLocalWorkDate matches today start time", () => {
  const ref = new Date(2026, 6, 13, 12, 0, 0);
  const started = new Date(2026, 6, 13, 8, 15, 0).toISOString();
  assert.equal(isSameLocalWorkDate(started, ref), true);
});

test("isSameLocalWorkDate rejects yesterday", () => {
  const ref = new Date(2026, 6, 13, 12, 0, 0);
  const started = new Date(2026, 6, 12, 23, 0, 0).toISOString();
  assert.equal(isSameLocalWorkDate(started, ref), false);
});

test("isWorkDateToday validates work_date string", () => {
  const ref = new Date(2026, 6, 13, 9, 0, 0);
  assert.equal(isWorkDateToday("2026-07-13", ref), true);
  assert.equal(isWorkDateToday("2026-07-12", ref), false);
});

test("formatWorkDurationMs renders HH:MM:SS", () => {
  assert.equal(formatWorkDurationMs(3661000), "01:01:01");
  assert.equal(formatWorkDurationMs(0), "00:00:00");
});
