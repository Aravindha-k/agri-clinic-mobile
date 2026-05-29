import { API_BASE_URL } from "./config";
import { clearTokens, getAccessToken, getRefreshToken, updateAccessToken } from "../storage/tokenStorage";
import { formatApiErrorMessage } from "../utils/apiError";
import { unwrapSuccessEnvelope } from "../utils/apiUnwrap";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

async function parseResponse(response: Response) {
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error("Server returned an unexpected response. Please try again.");
    }
  }
  if (!response.ok) {
    throw new Error(formatApiErrorMessage(data, "Request failed"));
  }
  const unwrapped = unwrapSuccessEnvelope(data);
  return unwrapped !== null ? unwrapped : data;
}

async function refreshAccessToken() {
  const refresh = await getRefreshToken();
  if (!refresh) {
    throw new Error("Session expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh })
  });

  const data = (await parseResponse(response)) as Record<string, unknown> | null;
  const access =
    (typeof data?.access === "string" && data.access) ||
    (typeof data?.access_token === "string" && data.access_token) ||
    (typeof data?.token === "string" && data.token);
  if (!access) {
    throw new Error("Refresh response did not include an access token.");
  }
  await updateAccessToken(access);
  return access;
}

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  if (body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await getAccessToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const request = () =>
    fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body
    });

  try {
    let response = await request();
    if (response.status === 401 && auth) {
      try {
        const newAccess = await refreshAccessToken();
        requestHeaders.set("Authorization", `Bearer ${newAccess}`);
        response = await request();
      } catch (error) {
        await clearTokens();
        throw error;
      }
    }

    return (await parseResponse(response)) as T;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("No internet connection. Check your network and try again.");
    }
    if (err instanceof Error && /network request failed|failed to fetch|network error/i.test(err.message)) {
      throw new Error("No internet connection. Check your network and try again.");
    }
    throw err;
  }
}
