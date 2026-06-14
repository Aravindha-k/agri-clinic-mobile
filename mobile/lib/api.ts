import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../../src/api/config";
import { getDeviceSessionHeaderEntries } from "../../src/api/deviceSessionHeaders";
import { refreshAccessTokenOnce } from "../../src/api/tokenRefresh";
import { getAccessToken } from "../../src/storage/tokenStorage";
import { setLanOnlyMode } from "../../src/utils/connectivityBus";
import { unwrapSuccessEnvelope } from "../../src/utils/apiUnwrap";

export const LAN_ONLY_MESSAGE =
  "Server only reachable on office Wi-Fi. Switch to tunnel or production URL.";

export const LAN_OFFLINE_BANNER_MESSAGE = "Not on office Wi-Fi — using offline mode";

/** True when the API base URL points at a private LAN host (office dev server). */
export function isLanUrl(url: string): boolean {
  return /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(url);
}

export function createLanOnlyError(message = LAN_ONLY_MESSAGE): Error & { code: "LAN_ONLY" } {
  const err = new Error(message) as Error & { code: "LAN_ONLY" };
  err.name = "LanOnlyError";
  err.code = "LAN_ONLY";
  return err;
}

export function isLanOnlyError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return (error as { code?: string }).code === "LAN_ONLY";
  }
  return false;
}

function isAxiosLanConnectivityFailure(error: AxiosError): boolean {
  return (
    error.code === "ECONNREFUSED" ||
    error.code === "ERR_NETWORK" ||
    (typeof error.message === "string" && error.message.includes("Network Error"))
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json"
  },
  timeout: 120_000
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const sessionHeaders = await getDeviceSessionHeaderEntries();
  for (const [name, value] of Object.entries(sessionHeaders)) {
    config.headers[name] = value;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      try {
        const refreshed = await refreshAccessTokenOnce();
        if (refreshed) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${refreshed}`;
          return api.request(config);
        }
      } catch {
        return Promise.reject(error);
      }
    }

    if (
      !error.response &&
      isAxiosLanConnectivityFailure(error) &&
      isLanUrl(api.defaults.baseURL ?? "")
    ) {
      setLanOnlyMode(true);
      return Promise.reject(createLanOnlyError());
    }

    return Promise.reject(error);
  }
);

export function isNetworkError(error: unknown): boolean {
  if (isLanOnlyError(error)) return true;
  if (axios.isAxiosError(error)) {
    return !error.response || error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED";
  }
  if (error instanceof Error) {
    return /network|offline|failed to fetch|timeout/i.test(error.message);
  }
  return false;
}

export function unwrapApiData<T>(data: unknown): T {
  const unwrapped = unwrapSuccessEnvelope<T>(data);
  return (unwrapped ?? data) as T;
}
