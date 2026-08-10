import { ApiRequestError } from "./apiError";

export type LoginNetworkErrorCategory =
  | "timeout"
  | "dns"
  | "tls"
  | "unreachable"
  | "invalid_credentials"
  | "server_unavailable"
  | "configuration"
  | "unknown";

export function logAuthEvent(phase: string, detail?: string) {
  console.warn(`[Auth] ${phase}${detail ? ` ${detail}` : ""}`);
}

export function categorizeLoginNetworkError(error: unknown): LoginNetworkErrorCategory {
  if (error instanceof ApiRequestError) {
    if (error.code === "CONFIG_ERROR") return "configuration";
    if (error.code === "INVALID_CREDENTIALS") return "invalid_credentials";
    if (error.code === "EMPLOYEE_INACTIVE" || error.code === "ACCOUNT_DISABLED") {
      return "invalid_credentials";
    }
    if (error.code === "SERVER_ERROR") return "server_unavailable";
    if (error.code === "NETWORK_TIMEOUT") return "timeout";
    if (error.code === "NETWORK_ERROR") return "unreachable";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (error.name === "AbortError" || message.includes("timeout") || message.includes("aborted")) {
      return "timeout";
    }
    if (message.includes("ssl") || message.includes("tls") || message.includes("certificate")) {
      return "tls";
    }
    if (message.includes("getaddrinfo") || message.includes("dns") || message.includes("host")) {
      return "dns";
    }
    if (
      message.includes("missing api configuration") ||
      message.includes("production apk missing") ||
      message.includes("must use https")
    ) {
      return "configuration";
    }
    if (
      message.includes("network request failed") ||
      message.includes("failed to fetch") ||
      message.includes("no internet")
    ) {
      return "unreachable";
    }
  }

  return "unknown";
}

export function loginErrorMessageForCategory(
  category: LoginNetworkErrorCategory,
  fallback: string
): string {
  switch (category) {
    case "timeout":
      return "Request timed out. Check your network and try again.";
    case "dns":
      return "Unable to reach server. Check your network connection.";
    case "tls":
      return "Secure connection failed. The app may be misconfigured for this server.";
    case "unreachable":
      return "Unable to reach server. Check your network and try again.";
    case "server_unavailable":
      return "Server unavailable. Please try again in a moment.";
    case "configuration":
      return "App configuration error. Reinstall the latest APK from your administrator.";
    case "invalid_credentials":
      return fallback;
    default:
      return fallback;
  }
}
