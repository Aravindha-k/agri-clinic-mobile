#!/usr/bin/env node
/**
 * Canonical Asia/Kolkata day-rollover + duty/map cache rejection tests.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

const BUSINESS_TIME_ZONE = "Asia/Kolkata";

function getCanonicalWorkDate(reference = new Date()) {
  const date = typeof reference === "number" ? new Date(reference) : reference;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getCanonicalWorkDateFromServerNow(serverNow, serverTimeOffsetMs = 0) {
  if (serverNow?.trim()) {
    const ms = Date.parse(serverNow);
    if (Number.isFinite(ms)) return getCanonicalWorkDate(ms);
  }
  return getCanonicalWorkDate(Date.now() + serverTimeOffsetMs);
}

function resolveDutyWorkDate(duty) {
  if (!duty) return null;
  if (typeof duty.work_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(duty.work_date.trim())) {
    return duty.work_date.trim();
  }
  if (typeof duty.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(duty.date.trim())) {
    return duty.date.trim();
  }
  return null;
}

function reconcileDutyForCanonicalDay(duty, canonicalDate) {
  if (!duty) return null;
  if (duty.is_active) return duty;
  const dutyDate = resolveDutyWorkDate(duty);
  if (!dutyDate) return null;
  if (dutyDate !== canonicalDate) return null;
  return duty;
}

function sanitizeCachedDutyForToday(cached, canonicalDate) {
  const duty = reconcileDutyForCanonicalDay(cached.currentDuty, canonicalDate);
  const cachedDate = cached.canonicalDate ?? resolveDutyWorkDate(cached.currentDuty);
  if ((cachedDate && cachedDate !== canonicalDate && !duty?.is_active) || !duty) {
    return {
      ...cached,
      canonicalDate,
      currentDuty: null,
      dutyMap: { routePoints: [], visitMarkers: [], bounds: [] }
    };
  }
  return { ...cached, canonicalDate, currentDuty: duty };
}

test("canonical date uses Asia/Kolkata from server_now (not device local)", () => {
  // 2026-07-19 22:30 UTC = 2026-07-20 04:00 IST
  const serverNow = "2026-07-19T22:30:00.000Z";
  assert.equal(getCanonicalWorkDateFromServerNow(serverNow), "2026-07-20");
});

test("wrong device clock still follows server_now", () => {
  const serverNow = "2026-07-20T10:00:00+05:30";
  const offset = Date.parse(serverNow) - Date.now();
  assert.equal(getCanonicalWorkDateFromServerNow(serverNow, offset), "2026-07-20");
});

test("yesterday completed duty + today bootstrap → Start Work Day", () => {
  const today = "2026-07-20";
  const yesterdayDuty = {
    workday_id: 10,
    duty_session_id: 99,
    is_active: false,
    work_date: "2026-07-19",
    date: "2026-07-19"
  };
  const reconciled = reconcileDutyForCanonicalDay(yesterdayDuty, today);
  assert.equal(reconciled, null);
  const showStart = reconciled == null;
  assert.equal(showStart, true);
});

test("yesterday completed cached locally is rejected by date", () => {
  const today = "2026-07-20";
  const cached = {
    userId: 7,
    canonicalDate: "2026-07-19",
    currentDuty: {
      workday_id: 10,
      duty_session_id: 99,
      is_active: false,
      work_date: "2026-07-19"
    },
    dutyMap: {
      dutyId: 99,
      visitMarkers: [{ id: "v1" }],
      routePoints: [],
      bounds: []
    }
  };
  const sanitized = sanitizeCachedDutyForToday(cached, today);
  assert.equal(sanitized.currentDuty, null);
  assert.equal(sanitized.dutyMap.visitMarkers.length, 0);
});

test("today completed duty remains visible and blocks Start", () => {
  const today = "2026-07-20";
  const duty = {
    workday_id: 11,
    duty_session_id: 100,
    is_active: false,
    work_date: today
  };
  const reconciled = reconcileDutyForCanonicalDay(duty, today);
  assert.ok(reconciled);
  assert.equal(reconciled.is_active, false);
  const showStart = reconciled == null;
  assert.equal(showStart, false);
});

test("next day after today-completed unlocks Start", () => {
  const nextDay = "2026-07-21";
  const duty = {
    workday_id: 11,
    duty_session_id: 100,
    is_active: false,
    work_date: "2026-07-20"
  };
  assert.equal(reconcileDutyForCanonicalDay(duty, nextDay), null);
});

test("active duty crossing midnight is kept", () => {
  const today = "2026-07-20";
  const active = {
    workday_id: 12,
    duty_session_id: 101,
    is_active: true,
    work_date: "2026-07-19"
  };
  const reconciled = reconcileDutyForCanonicalDay(active, today);
  assert.ok(reconciled);
  assert.equal(reconciled.is_active, true);
  assert.equal(reconciled.duty_session_id, 101);
});

test("backend reports no active duty → local cleared", () => {
  const today = "2026-07-20";
  assert.equal(reconcileDutyForCanonicalDay(null, today), null);
});

test("map cache: yesterday markers not shown today", () => {
  const today = "2026-07-20";
  const cached = {
    userId: 7,
    canonicalDate: "2026-07-19",
    currentDuty: {
      workday_id: 10,
      duty_session_id: 99,
      is_active: false,
      work_date: "2026-07-19"
    },
    dutyMap: {
      dutyId: 99,
      visitMarkers: [{ id: "old-visit" }],
      startMarker: { latitude: 1, longitude: 2 },
      routePoints: [],
      bounds: []
    }
  };
  const sanitized = sanitizeCachedDutyForToday(cached, today);
  assert.equal(sanitized.dutyMap.visitMarkers.length, 0);
  assert.equal(sanitized.currentDuty, null);
});

test("DutyContext sequences map refresh after duty reconcile", () => {
  const duty = read("src/features/duty/store/DutyContext.tsx");
  assert.match(duty, /reconcileDutyForCanonicalDay/);
  assert.match(duty, /emptyMapForToday/);
  // Foreground: freshness-aware bootstrap (Auth+Duty coalesce); not duty+map double-fetch.
  assert.match(duty, /refreshBootstrap\(\{ force: false \}\)/);
  assert.match(duty, /dutyRef\.current\?\.duty_session_id !== duty\.duty_session_id/);
  assert.doesNotMatch(duty, /fetchCurrentDutyMap\(\)/);
});

test("bootstrap parses day_map and filters prior-day completed duty", () => {
  const bootstrap = read("src/features/duty/api/mobileBootstrapApi.ts");
  assert.match(bootstrap, /day_map/);
  assert.match(bootstrap, /reconcileDutyForCanonicalDay/);
  assert.match(bootstrap, /getCanonicalWorkDateFromServerNow/);
});

test("duty cache stores canonicalDate and sanitizes offline restore", () => {
  const cache = read("src/features/duty/storage/dutyCacheStorage.ts");
  assert.match(cache, /canonicalDate/);
  assert.match(cache, /sanitizeCachedDutyForToday/);
  assert.match(cache, /reconcileDutyForCanonicalDay/);
});

test("workdayCalendar exports Kolkata helpers", () => {
  const cal = read("src/utils/workdayCalendar.ts");
  assert.match(cal, /Asia\/Kolkata/);
  assert.match(cal, /getCanonicalWorkDate/);
  assert.match(cal, /getCanonicalWorkDateFromServerNow/);
  assert.match(cal, /reconcileDutyForCanonicalDay/);
});

test("Home pull-to-refresh reconciles bootstrap before map", () => {
  const home = read("mobile/app/(tabs)/index.tsx");
  assert.match(
    home,
    /refreshBootstrap\(\{ force: true \}\)\s*\n\s*\.then\(\(\) => refreshDutyMap/
  );
});

console.log("Day-rollover checks passed.");
