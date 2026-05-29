/** Extract profile photo URL from API entities (supports common field names). */
export function extractPhotoUrl(entity: unknown): string | null {
  if (!entity || typeof entity !== "object") {
    return null;
  }
  const row = entity as Record<string, unknown>;
  const candidates = [
    row.profile_photo_url,
    row.profilePhotoUrl,
    row.employee_profile_photo_url,
    row.profile_photo,
    row.photo_url,
    row.photo,
    row.avatar_url,
    row.image_url,
    row.farmer_photo_url
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Cache-buster token from API (profile_photo_updated_at). */
export function extractPhotoUpdatedAt(entity: unknown): string | null {
  if (!entity || typeof entity !== "object") {
    return null;
  }
  const row = entity as Record<string, unknown>;
  const value =
    row.profile_photo_updated_at ??
    row.profilePhotoUpdatedAt ??
    row.photo_updated_at;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return null;
}

/** Prefer profile_photo_updated_at for cache busting, else explicit version. */
export function photoCacheVersion(entity: unknown, fallback?: string | number | null) {
  return extractPhotoUpdatedAt(entity) ?? fallback ?? null;
}

export function initialsFromName(name?: string | null, fallback = "?") {
  const parts = (name || fallback).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.[0] || fallback[0] || "?").toUpperCase();
}

/** Append cache-buster so Image reloads after upload. */
export function cacheBustPhotoUrl(url: string, version?: string | number | null) {
  if (!url) return url;
  const token = version ?? Date.now();
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(String(token))}`;
}
