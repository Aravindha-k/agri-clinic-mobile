import { API_BASE_URL } from "../api/config";

export function logDayTabOpen() {
  console.warn(`[DayTab] screen_open | release=${!__DEV__} api=${API_BASE_URL}`);
}

export function logDayTabApi(
  name: string,
  url: string,
  ok: boolean,
  detail?: string
) {
  console.warn(
    `[DayTab] api_${name} url=${url} ok=${ok}${detail ? ` — ${detail}` : ""}`
  );
}

export function logDayTabError(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[DayTab] error_${label} ${msg}`);
}
