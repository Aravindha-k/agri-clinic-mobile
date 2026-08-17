import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(ROOT, path), "utf8");

const directory = read("mobile/hooks/useFarmersDirectory.ts");
const farmersApi = read("mobile/lib/farmersApi.ts");
const workPanel = read("mobile/components/work/WorkQueuePanel.tsx");

test("farmer list uses server pagination and does not fetch-all before first render", () => {
  assert.match(directory, /const PAGE_SIZE = 30/);
  assert.match(directory, /fetchMobileFarmersPage\(/);
  assert.match(directory, /requestSeqRef/);
  assert.match(directory, /SEARCH_DEBOUNCE_MS = 300/);
  assert.match(directory, /setIsRefreshing\(true\)/);
  assert.match(directory, /loadError/);
  assert.match(directory, /mergeFarmerRows/);
  assert.match(directory, /Server already applied search\/village/);
  assert.match(farmersApi, /page_size/);
  assert.match(farmersApi, /params\.set\("page"/);
  assert.doesNotMatch(directory, /getAllFarmers\(/);
});

test("farmer list first page, next page, search, refresh, retry, and no duplicates", () => {
  assert.match(directory, /page:\s*1/);
  assert.match(directory, /fetchPageOne\("initial"\)/);
  assert.match(directory, /fetchPageOne\("refresh"\)/);
  assert.match(directory, /loadMore/);
  assert.match(directory, /nextUrl/);
  assert.match(directory, /byId\.set\(row\.id, row\)/);
  assert.match(workPanel, /farmers\.loadFailed/);
  assert.match(workPanel, /onAction=\{directory\.onRefresh\}/);

  function mergeFarmerRows(current, rows) {
    const byId = new Map(current.map((farmer) => [farmer.id, farmer]));
    for (const row of rows) byId.set(row.id, row);
    return Array.from(byId.values());
  }
  const merged = mergeFarmerRows(
    [
      { id: 1, name: "A" },
      { id: 2, name: "B" }
    ],
    [
      { id: 2, name: "B2" },
      { id: 3, name: "C" }
    ]
  );
  assert.equal(merged.length, 3);
  assert.equal(merged.find((row) => row.id === 2).name, "B2");
});

test("sync-all remains an explicit action, not the first-open path", () => {
  assert.match(farmersApi, /syncAllFarmersToCache/);
  assert.match(directory, /runFullSync/);
  const fetchPageOne = directory.slice(
    directory.indexOf("const fetchPageOne"),
    directory.indexOf("const loadMore")
  );
  assert.doesNotMatch(fetchPageOne, /syncAllFarmersToCache/);
});
