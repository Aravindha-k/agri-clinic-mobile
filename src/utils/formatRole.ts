/** "FieldAgent" → "Field agent" for UI labels. */
export function formatDisplayRole(role: string | null | undefined): string {
  const raw = role?.trim() || "Field staff";
  return raw
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
