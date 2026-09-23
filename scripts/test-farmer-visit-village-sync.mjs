/**
 * Fresh-farmer Village ID must stay the same from selection → create → returned Farmer → Visit.
 * Do not attach Farmer A + a leftover draft Village.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

function extractMasterPk(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  }
  if (typeof value === "object" && value !== null) {
    if ("id" in value) return extractMasterPk(value.id);
    if ("pk" in value) return extractMasterPk(value.pk);
  }
  return null;
}

function farmerVillagePk(farmer) {
  if (!farmer) return null;
  const fromVillage = extractMasterPk(farmer.village);
  if (fromVillage != null) return fromVillage;
  const fromVillageId = extractMasterPk(farmer.village_id);
  if (fromVillageId != null) return fromVillageId;
  if (farmer.village && typeof farmer.village === "object") {
    const row = farmer.village;
    return extractMasterPk(row.village_id) ?? extractMasterPk(row.village);
  }
  return null;
}

function farmerVillagePkToString(farmer) {
  const pk = farmerVillagePk(farmer);
  return pk != null ? String(pk) : "";
}

function coerceFarmerRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const nested = raw.farmer;
  const candidate =
    nested && typeof nested === "object" && !Array.isArray(nested) ? nested : raw;
  const id = extractMasterPk(candidate.id);
  if (id == null) return null;
  return { ...candidate, id };
}

function findFarmerByPhone(directory, phone, name) {
  const phoneNorm = String(phone || "").trim();
  const nameNorm = String(name || "").trim().toLowerCase();
  if (phoneNorm) {
    return directory.find((f) => String(f.phone || "").trim() === phoneNorm) ?? null;
  }
  if (nameNorm) {
    return directory.find((f) => String(f.name || "").trim().toLowerCase() === nameNorm) ?? null;
  }
  return null;
}

function buildVisitFromStore(state) {
  const farmer = state.farmer;
  const nf = state.newFarmer;
  return {
    farmer_id: farmer?.id != null ? String(farmer.id) : undefined,
    farmer_name: farmer?.name || nf?.name || "",
    farmer_phone: farmer?.phone || nf?.phone || "",
    village:
      farmerVillagePkToString(farmer) ||
      (extractMasterPk(nf?.village_id) != null ? String(extractMasterPk(nf?.village_id)) : "")
  };
}

async function prepareVisit({ values, directory = [], createImpl }) {
  const selectedVillage =
    extractMasterPk(values.village) != null ? String(extractMasterPk(values.village)) : "";
  let next = {
    ...values,
    farmer_id: values.farmer_id ? String(values.farmer_id) : "",
    village: selectedVillage
  };

  if (/^\d+$/.test(next.farmer_id)) {
    const full = directory.find((f) => String(f.id) === next.farmer_id);
    const farmer = coerceFarmerRecord(full);
    if (farmer) {
      const village = farmerVillagePkToString(farmer);
      if (village) {
        return { ...next, farmer_id: String(farmer.id), village, farmer };
      }
    }
    return next;
  }

  const match = findFarmerByPhone(directory, next.farmer_phone, next.farmer_name);
  if (match?.id != null) {
    const farmer = coerceFarmerRecord(match);
    const village = farmerVillagePkToString(farmer);
    return { ...next, farmer_id: String(farmer.id), village, farmer };
  }

  const villagePk = extractMasterPk(next.village);
  const createdRaw = await createImpl({
    name: next.farmer_name,
    phone: next.farmer_phone,
    village: villagePk
  });
  const created = coerceFarmerRecord(createdRaw);
  const village = farmerVillagePkToString(created) || String(villagePk);
  return { ...next, farmer_id: String(created.id), village, farmer: created };
}

test("farmer village PK normalizes id, nested object, and village_id — never name or String(object)", () => {
  assert.equal(farmerVillagePk({ village: 25 }), 25);
  assert.equal(farmerVillagePk({ village: "25" }), 25);
  assert.equal(farmerVillagePk({ village: { id: 25, name: "Kedar" } }), 25);
  assert.equal(farmerVillagePk({ village: "Kedar", village_id: 25 }), 25);
  assert.equal(farmerVillagePk({ village: { village_id: 25, name: "Kedar" } }), 25);
  assert.equal(farmerVillagePk({ village: "Kedar" }), null);
  assert.notEqual(String({ id: 25, name: "Kedar" }), "25");
  assert.equal(farmerVillagePkToString({ village: { id: 25 } }), "25");
});

test("selected Village 25 creates Farmer with 25 and Visit uses returned Farmer id + village", async () => {
  const selectedVillage = "25";
  const state = {
    farmer: null,
    newFarmer: { name: "Arun", phone: "9876500025", village_id: selectedVillage }
  };
  const values = buildVisitFromStore(state);
  assert.equal(values.village, "25");
  assert.equal(values.farmer_id, undefined);

  let createPayload = null;
  const prepared = await prepareVisit({
    values,
    directory: [],
    createImpl: async (payload) => {
      createPayload = payload;
      return { id: 9001, name: payload.name, phone: payload.phone, village: payload.village };
    }
  });

  assert.deepEqual(createPayload, { name: "Arun", phone: "9876500025", village: 25 });
  assert.equal(prepared.farmer_id, "9001");
  assert.equal(prepared.village, "25");
  assert.equal(farmerVillagePk(prepared.farmer), 25);
});

test("returned Farmer nested village object still becomes Visit village PK 25", async () => {
  const values = {
    farmer_name: "Arun",
    farmer_phone: "9876500025",
    village: "25"
  };
  const prepared = await prepareVisit({
    values,
    directory: [],
    createImpl: async (payload) => ({
      farmer: {
        id: 9001,
        name: payload.name,
        phone: payload.phone,
        village: { id: 25, name: "Kedar" }
      }
    })
  });
  assert.equal(prepared.farmer_id, "9001");
  assert.equal(prepared.village, "25");
  assert.notEqual(prepared.village, "[object Object]");
});

test("existing Farmer by phone uses that Farmer's village, not the new draft village", async () => {
  const values = {
    farmer_name: "Arun",
    farmer_phone: "9876500018",
    village: "25"
  };
  let created = false;
  const prepared = await prepareVisit({
    values,
    directory: [{ id: 410, name: "Arun", phone: "9876500018", village_id: 18, village: "Old Hamlet" }],
    createImpl: async () => {
      created = true;
      return { id: 999, village: 25 };
    }
  });
  assert.equal(created, false);
  assert.equal(prepared.farmer_id, "410");
  assert.equal(prepared.village, "18");
});

test("same name + different phone does not attach Farmer A + draft Village", async () => {
  const values = {
    farmer_name: "Ravi",
    farmer_phone: "9876500099",
    village: "25"
  };
  const prepared = await prepareVisit({
    values,
    directory: [{ id: 410, name: "Ravi", phone: "9000000410", village: 18 }],
    createImpl: async (payload) => ({
      id: 9002,
      name: payload.name,
      phone: payload.phone,
      village: payload.village
    })
  });
  assert.equal(prepared.farmer_id, "9002");
  assert.equal(prepared.village, "25");
});

test("second fresh Farmer uses its own Village — previous Village does not leak", async () => {
  const first = await prepareVisit({
    values: { farmer_name: "One", farmer_phone: "9876500001", village: "25" },
    directory: [],
    createImpl: async (payload) => ({ id: 1, ...payload })
  });
  const second = await prepareVisit({
    values: { farmer_name: "Two", farmer_phone: "9876500002", village: "31" },
    directory: [],
    createImpl: async (payload) => ({ id: 2, ...payload })
  });
  assert.equal(first.village, "25");
  assert.equal(first.farmer_id, "1");
  assert.equal(second.village, "31");
  assert.equal(second.farmer_id, "2");
  assert.notEqual(second.village, first.village);
});

test("prepare and submit bind Visit village from the resolved Farmer, with no client match-block", () => {
  const prepare = read("src/visit/prepareVisitSubmit.ts");
  const submit = read("mobile/lib/visitSubmitApi.ts");
  const masterId = read("src/utils/masterId.ts");
  const farmers = read("src/api/farmers.ts");
  const begin = read("mobile/lib/beginNewVisit.ts");

  assert.match(masterId, /farmerVillagePkToString/);
  assert.match(submit, /farmerVillagePkToString\(farmer\)/);
  assert.match(prepare, /applyResolvedFarmer/);
  assert.match(prepare, /villageFromResolvedFarmer/);
  assert.match(prepare, /createFarmer\(\{\s*name: farmerName,\s*phone: farmerPhone,\s*village: villagePk/s);
  assert.match(prepare, /bindResolvedFarmer\(next, created, String\(villagePk\)\)/);
  assert.match(prepare, /bindResolvedFarmer\(next, match\)/);
  assert.match(farmers, /if \(phoneNorm\)/);
  assert.match(farmers, /return results\.find\(\(f\) => \(f\.phone \|\| ""\)\.trim\(\) === phoneNorm\) \?\? null/);
  assert.doesNotMatch(farmers, /return page\.results\[0\]/);
  assert.doesNotMatch(prepare, /Visit village must match/);
  assert.doesNotMatch(submit, /Visit village must match/);
  assert.match(begin, /store\.reset\(\)/);
});
