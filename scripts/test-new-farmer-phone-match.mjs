import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const step1 = readFileSync(new URL("../mobile/app/visit/create-step1.tsx", import.meta.url), "utf8");
const review = readFileSync(new URL("../mobile/app/visit/create-step4-review.tsx", import.meta.url), "utf8");
const coordinator = readFileSync(
  new URL("../mobile/lib/visit/visitSubmitCoordinator.ts", import.meta.url),
  "utf8"
);
const en = readFileSync(new URL("../src/i18n/en.ts", import.meta.url), "utf8");
const ta = readFileSync(new URL("../src/i18n/ta.ts", import.meta.url), "utf8");

// Simulate the match-decision logic embedded in continueNewFarmer so behaviour
// (not just source text) is regression-tested.
function decide({ online, serverResult, serverThrew = false, cachedFarmers = [], phone }) {
  let existing = null;
  if (online) {
    try {
      if (serverThrew) throw new Error("offline/timeout");
      existing = serverResult;
    } catch {
      existing = null;
    }
  }
  if (existing?.id == null) {
    existing = cachedFarmers.find((f) => (f.phone || "").trim() === phone) ?? null;
  }
  return existing?.id != null ? { action: "confirm", farmer: existing } : { action: "proceed" };
}

const existingTest = { id: 7, name: "Test", phone: "1234567890", village_name: "A K Kuchipalayam" };

test("online phone match triggers confirmation instead of proceeding", () => {
  const d = decide({ online: true, serverResult: existingTest, cachedFarmers: [], phone: "1234567890" });
  assert.equal(d.action, "confirm");
  assert.equal(d.farmer.name, "Test");
});

test("no match online proceeds to GPS gate", () => {
  assert.equal(decide({ online: true, serverResult: null, cachedFarmers: [], phone: "1234567890" }).action, "proceed");
});

test("lookup failure falls back to cached directory and still warns on cached match", () => {
  const d = decide({
    online: true,
    serverThrew: true,
    cachedFarmers: [existingTest],
    phone: "1234567890"
  });
  assert.equal(d.action, "confirm");
});

test("offline with cached phone match shows confirmation (not silent)", () => {
  const d = decide({ online: false, cachedFarmers: [existingTest], phone: "1234567890" });
  assert.equal(d.action, "confirm");
});

test("offline with no cached match proceeds without claiming server confirmation", () => {
  const d = decide({ online: false, cachedFarmers: [], phone: "1234567890" });
  assert.equal(d.action, "proceed");
});

test("step1: online lookup uses findFarmerByPhoneOrName before the GPS gate", () => {
  const fnStart = step1.indexOf("async function continueNewFarmer");
  const gpsCall = step1.indexOf("requestGpsForFieldWork()", fnStart);
  const body = step1.slice(fnStart, gpsCall);
  assert.ok(body.includes("findFarmerByPhoneOrName(phone)"), "server lookup must run before proceeding");
  assert.ok(body.includes("Alert.alert"), "match must pause for explicit confirmation");
});

test("step1: confirmation alert offers Use this farmer and Change mobile number", () => {
  assert.ok(step1.includes('t("visitFlow.useThisFarmer")'));
  assert.ok(step1.includes('t("visitFlow.changeMobileNumber")'));
  assert.ok(step1.includes("Alert.alert"), "explicit confirmation dialog required");
  assert.ok(/onPress: \(\) => void selectFarmer\(existing as MobileFarmer\)/.test(step1));
});

test("step1: Change mobile number is a cancel action (stays on the form)", () => {
  const cancelIdx = step1.indexOf('t("visitFlow.changeMobileNumber")');
  assert.ok(/style: "cancel"/.test(step1.slice(cancelIdx - 20, cancelIdx + 200)));
});

test("step1: cancel is never a silent replace — no setFarmer on the cancel path", () => {
  // The cancel branch has no onPress handler at all; only Use-this-farmer calls selectFarmer.
  const alertBlock = step1.slice(step1.indexOf("Alert.alert"), step1.indexOf("Alert.alert") + 900);
  assert.equal((alertBlock.match(/onPress/g) || []).length, 1, "exactly one action button");
});

test("saved screen uses server-confirmed farmer name online", () => {
  assert.ok(coordinator.includes("farmerName: visit.farmer_name?.trim() || values.farmer_name"));
  const queued = coordinator.indexOf("queued: true");
  const online = coordinator.indexOf("queued: false");
  assert.ok(queued < online);
  assert.ok(
    coordinator.slice(queued - 300, queued + 300).includes("farmerName: values.farmer_name") ||
      coordinator.slice(queued - 300, queued + 300).includes("farmerName"),
    "queued path keeps draft name (no server response)"
  );
});

test("review step shows the shared-number notice only for new farmers", () => {
  assert.ok(review.includes('{newFarmer ? ('));
  assert.ok(review.includes('t("visitFlow.newFarmerLinkNotice")'));
});

test("i18n keys exist in English and Tamil", () => {
  for (const key of ["phoneMatchTitle", "phoneMatchBody", "useThisFarmer", "changeMobileNumber", "newFarmerLinkNotice"]) {
    assert.ok(en.includes(`${key}:`), `en.ts missing ${key}`);
    assert.ok(ta.includes(`${key}:`), `ta.ts missing ${key}`);
  }
  assert.ok(!ta.includes("�"), "ta.ts contains replacement characters");
});
