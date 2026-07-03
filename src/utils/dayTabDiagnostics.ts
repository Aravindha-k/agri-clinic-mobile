import { API_BASE_URL } from "../api/config";

export function logDayTabOpen() {
  if (!__DEV__) return;
  console.warn(`[DayTab] screen_open | release=${!__DEV__} api=${API_BASE_URL}`);
}

export function logDayTabApi(
  name: string,
  url: string,
  ok: boolean,
  detail?: string
) {
  if (!__DEV__) return;
  console.warn(
    `[DayTab] api_${name} url=${url} ok=${ok}${detail ? ` — ${detail}` : ""}`
  );
}

export function logDayTabError(label: string, err: unknown) {
  if (!__DEV__) return;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[DayTab] error_${label} ${msg}`);
}
