/** Mobile field-employee login username helpers (KAC- prefix UX). */

export const MOBILE_LOGIN_PREFIX = "KAC-";

/**
 * Legacy field IDs like AG-8821 use employee_id body field.
 * New KAC-ARAVINDH01 usernames use username body field.
 */
export function isLegacyEmployeeIdIdentifier(identifier: string): boolean {
  return /^[A-Za-z]+-\d+$/i.test(String(identifier ?? "").trim());
}

/**
 * Normalize the editable suffix only (what the employee types).
 * - trim + uppercase
 * - strip any pasted KAC- prefixes (never double)
 * - keep A-Z / 0-9 for generated IDs; allow one hyphen for legacy AG-8821
 */
export function normalizeMobileLoginSuffix(raw: string): string {
  let value = String(raw ?? "")
    .trim()
    .toUpperCase();
  while (value.startsWith(MOBILE_LOGIN_PREFIX)) {
    value = value.slice(MOBILE_LOGIN_PREFIX.length).trim();
  }
  value = value.replace(/[^A-Z0-9-]/g, "").replace(/-+/g, "-");
  if (isLegacyEmployeeIdIdentifier(value)) {
    return value;
  }
  // Generated mobile usernames are alphanumeric only.
  return value.replace(/[^A-Z0-9]/g, "");
}

/**
 * Full identifier sent to mobile/auth/login/.
 * Legacy AG-8821 stays unprefixed; new IDs become KAC-{SUFFIX}.
 */
export function toMobileLoginIdentifier(suffixOrFull: string): string {
  const suffix = normalizeMobileLoginSuffix(suffixOrFull);
  if (!suffix) return "";
  if (isLegacyEmployeeIdIdentifier(suffix)) {
    return suffix;
  }
  return `${MOBILE_LOGIN_PREFIX}${suffix}`;
}
