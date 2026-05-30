import { SESSION_EXPIRED_MESSAGE } from "../constants/authMessages";
import { SESSION_REPLACED_CODES, SESSION_REPLACED_MESSAGE } from "../constants/deviceSession";

const GENERIC_SUBMIT_MESSAGE = "Farmer, crop, and GPS location are required to submit a visit.";

const NETWORK_MESSAGE = "No internet connection. Check your network and try again.";
const SERVER_MESSAGE = "Our servers are busy right now. Please try again in a moment.";

export class ApiRequestError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, options?: { code?: string; status?: number }) {
    super(message);
    this.name = "ApiRequestError";
    this.code = options?.code;
    this.status = options?.status;
  }
}

export function extractApiErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const body = data as Record<string, unknown>;
  if (typeof body.code === "string" && body.code.trim()) {
    return body.code.trim();
  }
  return null;
}

export function isDeviceSessionConflictPayload(data: unknown, status: number): boolean {
  const code = extractApiErrorCode(data);
  if (code && SESSION_REPLACED_CODES.has(code)) return true;
  return status === 409 && code != null && SESSION_REPLACED_CODES.has(code);
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ApiRequestError && error.code === "NETWORK_ERROR") return true;
  if (error instanceof Error) {
    return /no internet|network request failed|failed to fetch|network error|timeout/i.test(error.message);
  }
  return false;
}

/** True only for confirmed session expiry — not generic 401 or server/network failures. */
export function isAuthExpiredError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.code === "SESSION_EXPIRED";
  }
  if (error instanceof Error) {
    return /session expired\.?\s*please sign in again/i.test(error.message);
  }
  return false;
}

export function isServerError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    if (error.code === "SERVER_ERROR") return true;
    if (error.status != null && error.status >= 500) return true;
  }
  return false;
}

export function networkError(message = NETWORK_MESSAGE) {
  return new ApiRequestError(message, { code: "NETWORK_ERROR" });
}

export function serverError(message = SERVER_MESSAGE, status = 500) {
  return new ApiRequestError(message, { code: "SERVER_ERROR", status });
}

export { NETWORK_MESSAGE, SERVER_MESSAGE, SESSION_EXPIRED_MESSAGE };

function humanizeField(key: string) {
  if (key === "non_field_errors") return "";
  if (key === "farmer" || key === "farmer_id") return "Farmer";
  if (key === "crop" || key === "crop_id") return "Crop";
  if (key === "latitude" || key === "longitude") return "GPS location";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldErrors(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") {
    return null;
  }

  const lines: string[] = [];
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      const text = value.map((item) => String(item)).filter(Boolean).join(", ");
      if (text) {
        const label = humanizeField(key);
        lines.push(label ? `${label}: ${text}` : text);
      }
    } else if (value && typeof value === "object") {
      const nested = formatFieldErrors(value);
      if (nested) {
        lines.push(`${humanizeField(key)}: ${nested}`);
      }
    } else if (typeof value === "string" && value.trim()) {
      lines.push(`${humanizeField(key)}: ${value.trim()}`);
    }
  }

  return lines.length ? lines.join("\n") : null;
}

/** Turn DRF / Agri API error bodies into a readable message. */
export function formatApiErrorMessage(data: unknown, fallback = "Request failed", httpStatus?: number): string {
  const code = extractApiErrorCode(data);
  if ((code && SESSION_REPLACED_CODES.has(code)) || (httpStatus === 409 && code && SESSION_REPLACED_CODES.has(code))) {
    return SESSION_REPLACED_MESSAGE;
  }
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const body = data as Record<string, unknown>;

  if (body.success === false) {
    const fieldMessage = formatFieldErrors(body.errors);
    if (fieldMessage) {
      return fieldMessage;
    }
    const topMessage = typeof body.message === "string" ? body.message.trim() : "";
    if (topMessage && topMessage !== GENERIC_SUBMIT_MESSAGE) {
      return topMessage;
    }
    if (topMessage) {
      return "Could not submit visit. Choose the farmer from the directory and confirm crop and GPS.";
    }
  }

  const nestedErrors = formatFieldErrors(body.errors);
  if (nestedErrors) {
    return nestedErrors;
  }

  if (typeof body.detail === "string" && body.detail.trim()) {
    return body.detail.trim();
  }

  if (Array.isArray(body.detail)) {
    const lines = body.detail.map((item) => String(item)).filter(Boolean);
    if (lines.length) {
      return lines.join("\n");
    }
  }

  if (typeof body.message === "string" && body.message.trim()) {
    const msg = body.message.trim();
    if (msg === GENERIC_SUBMIT_MESSAGE) {
      return "Farmer could not be linked. For a new farmer, check name, mobile, district, and village.";
    }
    return msg;
  }

  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim();
  }

  const fieldLines: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (key === "detail" || key === "message" || key === "error" || key === "success" || key === "errors" || key === "code") {
      continue;
    }
    if (Array.isArray(value)) {
      const text = value.map((item) => String(item)).filter(Boolean).join(", ");
      if (text) {
        fieldLines.push(`${humanizeField(key)}: ${text}`);
      }
    } else if (typeof value === "string" && value.trim()) {
      fieldLines.push(`${humanizeField(key)}: ${value.trim()}`);
    }
  }

  if (fieldLines.length) {
    return fieldLines.join("\n");
  }

  return fallback;
}
