import { formatIndiaRelativeTime } from "./indiaDateTime";

/** Human-readable relative time, e.g. "5 minutes ago", "just now". */
export function formatRelativeTime(iso?: string | null): string {
  return formatIndiaRelativeTime(iso);
}
