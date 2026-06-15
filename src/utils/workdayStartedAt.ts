/** Resolve workday start timestamp from API fields (ISO or date + time). */
export type WorkdayStartedAtSource = {
  started_at?: string | null;
  start_time?: string | null;
  date?: string | null;
};

export function resolveWorkdayStartedAt(
  status: WorkdayStartedAtSource | null | undefined
): string | null {
  if (!status) {
    return null;
  }

  const raw = status.started_at || status.start_time;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw).getTime();
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  if (status.date && raw.includes(":")) {
    const combined = `${status.date}T${raw}`;
    const combinedTs = new Date(combined).getTime();
    if (!Number.isNaN(combinedTs)) {
      return new Date(combinedTs).toISOString();
    }
  }

  return raw;
}

export function getWorkdayStartTimestamp(startedAt: string | null | undefined): number | null {
  if (!startedAt) {
    return null;
  }

  const timestamp = new Date(startedAt).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}
