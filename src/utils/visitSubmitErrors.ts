import { ApiRequestError, formatApiErrorMessage, isNetworkError, NETWORK_MESSAGE, SERVER_MESSAGE } from "./apiError";
import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";

export const VISIT_SUBMIT_FALLBACK = "Could not submit the visit. Please try again.";

function looksLikeRawJson(text: string): boolean {
  const trimmed = text.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function parseMaybeJson(text: string): unknown | null {
  if (!looksLikeRawJson(text)) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Canonical employee-facing visit submit error.
 * Never returns JSON.stringify / stack / HTML / axios internals.
 */
export function normalizeVisitSubmitUserMessage(
  input: unknown,
  options?: { httpStatus?: number; fallback?: string }
): string {
  const fallback = options?.fallback ?? VISIT_SUBMIT_FALLBACK;
  const status = options?.httpStatus;

  if (input instanceof ApiRequestError) {
    if (input.code === "SESSION_REPLACED" || input.code === "DEVICE_SESSION_CONFLICT") {
      return SESSION_REPLACED_MESSAGE;
    }
    if (input.code === "SESSION_EXPIRED") {
      return SESSION_EXPIRED_MESSAGE;
    }
    if (input.code === "NETWORK_ERROR" || isNetworkError(input)) {
      return NETWORK_MESSAGE;
    }
    if (input.status === 413) {
      return "One or more files are too large. Please use a smaller photo or document.";
    }
    if (input.status === 415) {
      return "That file type is not supported. Please use a photo, PDF, or voice recording.";
    }
    if (input.status === 403) {
      return "You do not have permission to submit this visit.";
    }
    if (input.status === 404) {
      return "The farmer or crop is no longer available. Please refresh and try again.";
    }
    if (input.status != null && input.status >= 500) {
      return SERVER_MESSAGE;
    }
    const msg = input.message?.trim();
    if (msg && !looksLikeRawJson(msg)) {
      return msg;
    }
    return fallback;
  }

  if (isNetworkError(input)) {
    return NETWORK_MESSAGE;
  }

  if (typeof input === "string") {
    const parsed = parseMaybeJson(input);
    if (parsed != null) {
      return formatApiErrorMessage(parsed, fallback, status);
    }
    const lower = input.toLowerCase();
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return "The request timed out. Check your signal and try again.";
    }
    if (lower.includes("network")) {
      return NETWORK_MESSAGE;
    }
    if (looksLikeRawJson(input) || input.includes(" at ") && input.includes("Error:")) {
      return fallback;
    }
    return input.trim() || fallback;
  }

  if (input && typeof input === "object") {
    const err = input as { message?: unknown; status?: number; response?: { status?: number; data?: unknown } };
    const httpStatus = status ?? err.status ?? err.response?.status;
    if (httpStatus === 401) return SESSION_EXPIRED_MESSAGE;
    if (httpStatus === 409) {
      const data = err.response?.data;
      const formatted = formatApiErrorMessage(data ?? input, SESSION_REPLACED_MESSAGE, 409);
      return formatted;
    }
    if (httpStatus === 413) {
      return "One or more files are too large. Please use a smaller photo or document.";
    }
    if (httpStatus === 415) {
      return "That file type is not supported. Please use a photo, PDF, or voice recording.";
    }
    if (httpStatus === 403) {
      return "You do not have permission to submit this visit.";
    }
    if (httpStatus != null && httpStatus >= 500) {
      return SERVER_MESSAGE;
    }
    if (err.response?.data != null) {
      return formatApiErrorMessage(err.response.data, fallback, httpStatus);
    }
    if (typeof err.message === "string") {
      return normalizeVisitSubmitUserMessage(err.message, { httpStatus, fallback });
    }
    return formatApiErrorMessage(input, fallback, httpStatus);
  }

  return fallback;
}

/** Build a user-facing Error from multipart XHR status + body. */
export function visitSubmitErrorFromHttp(status: number, data: unknown, rawText?: string): Error {
  if (status === 401) {
    return new ApiRequestError(SESSION_EXPIRED_MESSAGE, { code: "SESSION_EXPIRED", status: 401 });
  }
  if (status === 409) {
    return new ApiRequestError(
      formatApiErrorMessage(data, SESSION_REPLACED_MESSAGE, 409),
      { code: "SESSION_REPLACED", status: 409 }
    );
  }
  const message = normalizeVisitSubmitUserMessage(data ?? rawText ?? null, {
    httpStatus: status,
    fallback: VISIT_SUBMIT_FALLBACK
  });
  return new ApiRequestError(message, {
    code: status >= 500 ? "SERVER_ERROR" : "VISIT_SUBMIT_FAILED",
    status
  });
}
