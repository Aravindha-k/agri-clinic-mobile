export type MapStyleValidationResult = {
  ok: boolean;
  status?: number;
  reason?: string;
};

/**
 * Verify a MapLibre style URL responds with valid style JSON.
 * Used for diagnostics — does not block map mount on failure.
 */
export async function validateMapStyleUrl(url: string): Promise<MapStyleValidationResult> {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) {
    return { ok: false, reason: "Style URL is empty." };
  }

  if (!trimmed.startsWith("https://")) {
    return { ok: false, reason: "Style URL must use HTTPS." };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(trimmed, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    clearTimeout(timer);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        reason: `HTTP ${response.status} ${response.statusText}`.trim()
      };
    }

    const json = (await response.json()) as Record<string, unknown>;
    const hasLayers = Array.isArray(json.layers) && json.layers.length > 0;
    const hasSources = json.sources != null && typeof json.sources === "object";
    const hasVersion = typeof json.version === "number";

    if (!hasLayers && !hasSources && !hasVersion) {
      return { ok: false, reason: "Response is not a valid MapLibre style JSON." };
    }

    return { ok: true, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: message };
  }
}
