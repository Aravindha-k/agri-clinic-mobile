import { API_BASE_URL } from "../api/config";

/** Convert DRF `next`/`previous` absolute URL to a path for `apiClient`. */
export function apiPathFromNextUrl(nextUrl: string): string {
  const trimmed = nextUrl.trim();
  if (!trimmed) {
    return "";
  }

  const base = API_BASE_URL.replace(/\/$/, "");
  if (trimmed.startsWith(base)) {
    return trimmed.slice(base.length).replace(/^\//, "");
  }

  try {
    const next = new URL(trimmed);
    const baseUrl = new URL(`${base}/`);
    if (next.origin === baseUrl.origin) {
      const basePath = baseUrl.pathname.replace(/\/$/, "");
      let path = next.pathname;
      if (basePath && path.startsWith(basePath)) {
        path = path.slice(basePath.length);
      }
      return `${path.replace(/^\//, "")}${next.search}`;
    }
  } catch {
    /* ignore malformed URL */
  }

  return trimmed.replace(/^\//, "");
}
