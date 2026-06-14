import { unwrapSuccessEnvelope } from "./apiUnwrap";

export type NormalizedLoginResponse = {
  access: string;
  refresh: string;
  user?: Record<string, unknown> | null;
  deviceSessionId: string;
  sessionVersion?: string | null;
  activeDeviceId?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function extractSessionIdFromRow(row: Record<string, unknown>): string | null {
  const session = asRecord(row.session);
  const candidates = [
    row.device_session_id,
    row.deviceSessionId,
    row.device_session,
    row.session_id,
    session?.device_session_id,
    session?.deviceSessionId,
    session?.device_session,
    session?.session_id,
    session?.id
  ];
  for (const candidate of candidates) {
    const value = pickString(candidate);
    if (value) {
      return value;
    }
  }
  return null;
}

function collectLoginRows(payload: unknown): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();

  function walk(value: unknown, depth: number) {
    if (depth > 8 || value == null || seen.has(value)) {
      return;
    }
    seen.add(value);

    const row = asRecord(value);
    if (!row) {
      return;
    }

    rows.push(row);
    for (const key of ["data", "session", "result", "payload"]) {
      walk(row[key], depth + 1);
    }
  }

  walk(payload, 0);
  walk(unwrapSuccessEnvelope(payload), 0);
  return rows;
}

/**
 * Normalize mobile login payloads from flat or nested API envelopes.
 * Backend (mobile/auth/login/) returns:
 * { access, refresh, device_session_id, session_version, active_device_id, user }
 */
export function normalizeLoginResponse(payload: unknown): NormalizedLoginResponse {
  const rows = collectLoginRows(payload);

  let access: string | null = null;
  let refresh: string | null = null;
  let deviceSessionId: string | null = null;
  let sessionVersion: string | null = null;
  let activeDeviceId: string | null = null;
  let user: Record<string, unknown> | null = null;

  for (const row of rows) {
    access =
      access ||
      pickString(row.access) ||
      pickString(row.access_token) ||
      pickString(row.token);
    refresh =
      refresh ||
      pickString(row.refresh) ||
      pickString(row.refresh_token);
    deviceSessionId = deviceSessionId || extractSessionIdFromRow(row);
    sessionVersion =
      sessionVersion ||
      pickString(row.session_version) ||
      pickString(row.sessionVersion);
    activeDeviceId =
      activeDeviceId ||
      pickString(row.active_device_id) ||
      pickString(row.activeDeviceId) ||
      pickString(row.device_id);
    if (!user) {
      user = asRecord(row.user);
    }
  }

  if (!access || !refresh) {
    throw new Error("Login response did not include access and refresh tokens.");
  }
  if (!deviceSessionId) {
    throw new Error("Login succeeded but device session was not returned. Please update the app or contact support.");
  }

  return {
    access,
    refresh,
    user,
    deviceSessionId,
    sessionVersion,
    activeDeviceId
  };
}
