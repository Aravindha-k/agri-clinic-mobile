import { SESSION_REPLACED_CODES } from "../constants/deviceSession";
import { extractApiErrorCode } from "./apiError";

export type AuthFailureKind = "token_expired" | "device_session" | "credentials" | "uncertain";

function messageFromBody(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const body = data as Record<string, unknown>;
  if (typeof body.detail === "string") return body.detail.toLowerCase();
  if (typeof body.message === "string") return body.message.toLowerCase();
  return "";
}

/** Classify HTTP 401 bodies — only `token_expired` should trigger logout after refresh retry. */
export function classify401Response(data: unknown, status: number): AuthFailureKind {
  if (status !== 401) return "uncertain";

  const code = (extractApiErrorCode(data) ?? "").toUpperCase();
  const msg = messageFromBody(data);

  if (code && SESSION_REPLACED_CODES.has(code)) {
    return "device_session";
  }
  if (
    code.includes("DEVICE_SESSION") ||
    code.includes("DEVICE") ||
    msg.includes("device session") ||
    msg.includes("x-device-session")
  ) {
    return "device_session";
  }
  if (
    code === "TOKEN_NOT_VALID" ||
    code === "TOKEN_EXPIRED" ||
    code === "AUTHENTICATION_FAILED" ||
    msg.includes("token not valid") ||
    msg.includes("token expired") ||
    msg.includes("invalid token")
  ) {
    return "token_expired";
  }
  if (code === "INVALID_CREDENTIALS" || msg.includes("credential") || msg.includes("password")) {
    return "credentials";
  }

  return "uncertain";
}

export function isRetriable401(data: unknown, status: number): boolean {
  const kind = classify401Response(data, status);
  return kind === "uncertain" || kind === "device_session";
}
