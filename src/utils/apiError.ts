import { DEVICE_SESSION_CONFLICT_CODE } from "../constants/deviceSession";

const GENERIC_SUBMIT_MESSAGE = "Farmer, crop, and GPS location are required to submit a visit.";

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
  if (code === DEVICE_SESSION_CONFLICT_CODE) return true;
  return status === 409 && code === DEVICE_SESSION_CONFLICT_CODE;
}

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
  if (code === DEVICE_SESSION_CONFLICT_CODE || httpStatus === 409 && code === DEVICE_SESSION_CONFLICT_CODE) {
    return "Your account is active on another device. Please login again.";
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
