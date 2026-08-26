/**
 * Asia/Kolkata display + legacy visit_date/visit_time UTC contract.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

// Pure mirror of critical helpers so Node tests do not need Metro/TS transpile.
const BUSINESS_TIME_ZONE = "Asia/Kolkata";
const OFFSET_AWARE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const NAIVE_DATE_TIME =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseServerInstant(value, options) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (DATE_ONLY.test(raw)) {
    const ms = Date.parse(`${raw}T06:30:00.000Z`);
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  if (OFFSET_AWARE.test(raw)) {
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  const naive = raw.match(NAIVE_DATE_TIME);
  if (naive) {
    const normalized = `${naive[1]}T${naive[2]}`;
    const ms = options?.assumeUtcIfNaive
      ? Date.parse(`${normalized}Z`)
      : Date.parse(normalized);
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

function formatParts(instant, options) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: BUSINESS_TIME_ZONE, ...options }).format(instant);
}

function formatIndiaDateTime(value) {
  const d = parseServerInstant(value);
  if (!d) return "Not recorded";
  const date = formatParts(d, { day: "numeric", month: "short", year: "numeric" });
  const time = formatParts(d, { hour: "numeric", minute: "2-digit", hour12: true }).replace(
    /\b(am|pm)\b/gi,
    (m) => m.toUpperCase()
  );
  return `${date} · ${time}`;
}

function legacyVisitDateTimeToIso(visitDate, visitTime) {
  if (!visitDate) return null;
  const datePart = String(visitDate).trim();
  const dateOnly = datePart.includes("T") ? datePart.split("T")[0] : datePart.slice(0, 10);
  if (!DATE_ONLY.test(dateOnly)) return null;
  if (!visitTime) return `${dateOnly}T06:30:00.000Z`;
  const timeRaw = String(visitTime).trim();
  if (OFFSET_AWARE.test(timeRaw) || timeRaw.includes("T")) {
    const d = parseServerInstant(timeRaw.includes("T") ? timeRaw : `${dateOnly}T${timeRaw}`);
    return d ? d.toISOString() : null;
  }
  let timePart = timeRaw.length <= 5 ? `${timeRaw}:00` : timeRaw;
  if (/^\d{2}:\d{2}:\d{2}$/.test(timePart)) timePart = `${timePart}.000`;
  const iso = `${dateOnly}T${timePart}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function normalize(s) {
  return String(s)
    .replace(/\u202f/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

test("offset-aware UTC timestamps format to Asia/Kolkata with date+time", () => {
  assert.equal(
    normalize(formatIndiaDateTime("2026-08-26T17:29:00Z")),
    normalize("26 Aug 2026 · 10:59 PM")
  );
  assert.equal(
    normalize(formatIndiaDateTime("2026-08-26T17:29:00+00:00")),
    normalize("26 Aug 2026 · 10:59 PM")
  );
  assert.equal(
    normalize(formatIndiaDateTime("2026-08-26T22:59:00+05:30")),
    normalize("26 Aug 2026 · 10:59 PM")
  );
});

test("date rollover across midnight IST", () => {
  assert.equal(
    normalize(formatIndiaDateTime("2026-08-26T20:00:00Z")),
    normalize("27 Aug 2026 · 1:30 AM")
  );
});

test("month and year rollover", () => {
  assert.match(normalize(formatIndiaDateTime("2026-08-31T20:00:00Z")), /1 SEP(T)? 2026/);
  assert.match(normalize(formatIndiaDateTime("2026-12-31T20:00:00Z")), /1 JAN 2027/);
});
test("legacy visit_date + visit_time UTC slices display as IST", () => {
  const iso = legacyVisitDateTimeToIso("2026-08-26", "17:29:00");
  assert.ok(iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso));
  assert.equal(normalize(formatIndiaDateTime(iso)), normalize("26 Aug 2026 · 10:59 PM"));
});

test("already +05:30 is not double-converted", () => {
  const a = normalize(formatIndiaDateTime("2026-08-26T22:59:00+05:30"));
  const b = normalize(formatIndiaDateTime("2026-08-26T17:29:00Z"));
  assert.equal(a, b);
});

test("null / undefined / invalid", () => {
  assert.equal(formatIndiaDateTime(null), "Not recorded");
  assert.equal(formatIndiaDateTime(undefined), "Not recorded");
  assert.equal(formatIndiaDateTime("not-a-date"), "Not recorded");
  assert.equal(legacyVisitDateTimeToIso(null, "17:29:00"), null);
});

test("shared format helpers and visitDisplayIso use India module / Z legacy", () => {
  const format = read("src/utils/format.ts");
  assert.match(format, /legacyVisitDateTimeToIso/);
  assert.match(format, /formatIndiaDateTime/);
  assert.match(format, /formatIndiaShortDateTime/);
  assert.doesNotMatch(format, /toLocaleString\(undefined/);

  const mobileFormat = read("mobile/lib/format.ts");
  assert.match(mobileFormat, /formatIndiaTime/);
  assert.doesNotMatch(mobileFormat, /toLocaleTimeString\(undefined/);

  const watermark = read("src/utils/visitPhotoWatermark.ts");
  assert.match(watermark, /formatIndiaDateTime/);

  const clock = read("src/hooks/useLiveClock.ts");
  assert.match(clock, /formatIndiaTime/);
  assert.doesNotMatch(clock, /toLocaleTimeString\(undefined/);

  const india = read("src/utils/indiaDateTime.ts");
  assert.match(india, /BUSINESS_TIME_ZONE/);
  assert.doesNotMatch(india, /19800000|\+ 5 \* 60|5 \* 60 \* 60 \* 1000/);
});

test("source module exports match mirrored contract", () => {
  const src = read("src/utils/indiaDateTime.ts");
  assert.match(src, /export function parseServerInstant/);
  assert.match(src, /export function formatIndiaDateTime/);
  assert.match(src, /export function legacyVisitDateTimeToIso/);
  assert.match(src, /assumeUtcIfNaive/);
});
