type ApiCallRecord = {
  url: string;
  count: number;
  duplicateCount: number;
  sources: Set<string>;
};

const records = new Map<string, ApiCallRecord>();

/** Dev-only: record an API request for duplicate detection. */
export function trackApiCall(path: string, source?: string, duplicate = false) {
  if (!__DEV__) return;
  const key = path.split("?")[0] || path;
  const row = records.get(key) ?? { url: key, count: 0, duplicateCount: 0, sources: new Set<string>() };
  row.count += 1;
  if (duplicate) row.duplicateCount += 1;
  if (source) row.sources.add(source);
  records.set(key, row);
}

export function logApiTelemetrySummary() {
  if (!__DEV__ || records.size === 0) return;
  const rows = [...records.values()].sort((a, b) => b.count - a.count);
  console.log("[API telemetry] call summary");
  for (const row of rows) {
    const sources = [...row.sources].join(", ") || "—";
    console.log(
      `  ${row.url} | count=${row.count} | duplicates=${row.duplicateCount} | sources=${sources}`
    );
  }
}

export function resetApiTelemetry() {
  records.clear();
}
