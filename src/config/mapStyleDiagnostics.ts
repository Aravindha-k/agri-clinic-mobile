type MapStyleEvent =
  | "map_style_selected"
  | "map_style_load_started"
  | "map_style_loaded"
  | "map_style_load_failed";

type MapStyleLogDetails = {
  host: string;
  env: string;
  screenName?: string;
  errorCode?: string;
};

function styleHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

function currentEnv(): string {
  return String(process.env.EXPO_PUBLIC_ENV ?? (__DEV__ ? "development" : "production"));
}

/** Safe map-style diagnostics — host/env/screen only, no tokens or full URLs. */
export function logMapStyleEvent(event: MapStyleEvent, url: string, details: Partial<MapStyleLogDetails> = {}) {
  const payload: MapStyleLogDetails = {
    host: styleHost(url),
    env: details.env ?? currentEnv(),
    ...(details.screenName ? { screenName: details.screenName } : {}),
    ...(details.errorCode ? { errorCode: details.errorCode } : {})
  };
  console.warn(`[mapStyle:${event}]`, payload);
}

export { styleHost, currentEnv };
