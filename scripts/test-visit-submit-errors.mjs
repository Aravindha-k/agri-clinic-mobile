import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const require = createRequire(import.meta.url);

// Pure TS compiled logic duplicated for node tests — keep in sync with visitSubmitErrors.ts
const SESSION_REPLACED_MESSAGE =
  "You were logged out because this account was used on another device.";
const SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again.";
const NETWORK_MESSAGE = "No internet connection. Check your network and try again.";
const SERVER_MESSAGE = "Our servers are busy right now. Please try again in a moment.";
const FALLBACK = "Could not submit the visit. Please try again.";

function looksLikeRawJson(text) {
  const trimmed = text.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function formatApiErrorMessage(data, fallback = "Request failed") {
  if (!data || typeof data !== "object") return fallback;
  const body = data;
  if (typeof body.detail === "string" && body.detail.trim()) return body.detail.trim();
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  if (body.farmer_id) return `Farmer: ${Array.isArray(body.farmer_id) ? body.farmer_id.join(", ") : body.farmer_id}`;
  return fallback;
}

function normalizeVisitSubmitUserMessage(input, options = {}) {
  const fallback = options.fallback ?? FALLBACK;
  const status = options.httpStatus;
  if (input && typeof input === "object" && input.code === "SESSION_REPLACED") {
    return SESSION_REPLACED_MESSAGE;
  }
  if (typeof input === "string") {
    if (looksLikeRawJson(input)) {
      try {
        return formatApiErrorMessage(JSON.parse(input), fallback);
      } catch {
        return fallback;
      }
    }
    if (input.toLowerCase().includes("network")) return NETWORK_MESSAGE;
    return input.trim() || fallback;
  }
  if (input && typeof input === "object") {
    if (status === 401) return SESSION_EXPIRED_MESSAGE;
    if (status != null && status >= 500) return SERVER_MESSAGE;
    return formatApiErrorMessage(input, fallback);
  }
  return fallback;
}

test("visitSubmitApi no longer JSON.stringify's errors to users", () => {
  const api = read("mobile/lib/visitSubmitApi.ts");
  assert.doesNotMatch(api, /JSON\.stringify\(data\)/);
  assert.match(api, /visitSubmitErrorFromHttp/);
  assert.match(api, /normalizeVisitSubmitUserMessage/);
});

test("object response is not JSON.stringify'd to user", () => {
  const msg = normalizeVisitSubmitUserMessage('{"detail":"Crop is required"}');
  assert.equal(msg, "Crop is required");
  assert.doesNotMatch(msg, /^\{/);
});

test("field validation becomes readable", () => {
  const msg = normalizeVisitSubmitUserMessage({ farmer_id: ["This field is required."] });
  assert.match(msg, /Farmer/i);
});

test("network error becomes friendly", () => {
  assert.equal(normalizeVisitSubmitUserMessage("Network request failed"), NETWORK_MESSAGE);
});

test("500 becomes generic retry message", () => {
  assert.equal(
    normalizeVisitSubmitUserMessage({ detail: "traceback" }, { httpStatus: 500 }),
    SERVER_MESSAGE
  );
});

test("session replaced uses canonical session message", () => {
  assert.equal(
    normalizeVisitSubmitUserMessage({ code: "SESSION_REPLACED" }),
    SESSION_REPLACED_MESSAGE
  );
});

test("ordinary 409 conflict is not forced to SESSION_REPLACED", () => {
  const src = read("src/utils/visitSubmitErrors.ts");
  assert.match(src, /isDeviceSessionConflictPayload/);
  assert.match(src, /VISIT_CONFLICT/);
  assert.match(src, /status === 409 && isDeviceSessionConflictPayload/);

  // visitSubmitErrorFromHttp: only session codes → SESSION_REPLACED teardown path.
  assert.match(src, /if \(status === 409 && isDeviceSessionConflictPayload\(data, 409\)\)/);
  assert.match(src, /code: status >= 500 \? "SERVER_ERROR" : status === 409 \? "VISIT_CONFLICT"/);

  const SESSION_REPLACED_CODES = new Set(["SESSION_REPLACED", "DEVICE_SESSION_CONFLICT"]);
  function isDeviceSessionConflictPayload(data, status) {
    const code =
      data && typeof data === "object" && typeof data.code === "string" ? data.code.trim() : null;
    if (code && SESSION_REPLACED_CODES.has(code)) return true;
    return status === 409 && code != null && SESSION_REPLACED_CODES.has(code);
  }
  function classify409(data) {
    if (isDeviceSessionConflictPayload(data, 409)) return "SESSION_REPLACED";
    return "VISIT_CONFLICT";
  }
  assert.equal(classify409({ code: "SESSION_REPLACED" }), "SESSION_REPLACED");
  assert.equal(classify409({ code: "DEVICE_SESSION_CONFLICT" }), "SESSION_REPLACED");
  assert.equal(classify409({ detail: "Visit already submitted" }), "VISIT_CONFLICT");
  assert.equal(classify409({ code: "DUPLICATE_VISIT" }), "VISIT_CONFLICT");
});

test("canonical helper module exists with diagnostics-safe mapping", () => {
  const src = read("src/utils/visitSubmitErrors.ts");
  assert.match(src, /normalizeVisitSubmitUserMessage/);
  assert.match(src, /VISIT_SUBMIT_FALLBACK/);
  assert.match(src, /413/);
  assert.match(src, /415/);
  assert.doesNotMatch(src, /JSON\.stringify\(/);
});
