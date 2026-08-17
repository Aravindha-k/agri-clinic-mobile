/** Mobile field-employee login identifier helpers (KAC- prefix UX). */

export const MOBILE_LOGIN_PREFIX = "KAC-";

const CANONICAL_EMPLOYEE_ID = /^KAC-\d+$/i;
/** LETTERS-DIGITS such as KAC-0001 or leftover AG-8821. */
const LETTERS_HYPHEN_DIGITS = /^[A-Za-z]+-\d+$/;

export function isCanonicalEmployeeId(identifier: string): boolean {
  return CANONICAL_EMPLOYEE_ID.test(String(identifier ?? "").trim());
}

/**
 * Identifiers that use the employee_id login body field.
 * Canonical: KAC-0001. Legacy numeric codes: AG-8821.
 * Name-based leftovers (KAC-ARAVINDH01) stay on username for old biometric material.
 */
export function usesEmployeeIdPayload(identifier: string): boolean {
  return LETTERS_HYPHEN_DIGITS.test(String(identifier ?? "").trim());
}

/** @deprecated Use usesEmployeeIdPayload — kept for existing callers/tests. */
export function isLegacyEmployeeIdIdentifier(identifier: string): boolean {
  return usesEmployeeIdPayload(identifier);
}

function isUnprefixedLegacyNumericId(value: string): boolean {
  return LETTERS_HYPHEN_DIGITS.test(value) && !value.toUpperCase().startsWith(MOBILE_LOGIN_PREFIX);
}

/**
 * Normalize the editable suffix only (what the employee types).
 * - trim + uppercase
 * - strip any pasted KAC- prefixes (never double)
 * - keep digits for KAC-0001
 * - keep AG-8821-style leftover codes without adding KAC-
 */
export function normalizeMobileLoginSuffix(raw: string): string {
  let value = String(raw ?? "")
    .trim()
    .toUpperCase();
  while (value.startsWith(MOBILE_LOGIN_PREFIX)) {
    value = value.slice(MOBILE_LOGIN_PREFIX.length).trim();
  }
  if (isUnprefixedLegacyNumericId(value)) {
    return value;
  }
  return value.replace(/[^0-9]/g, "");
}

/**
 * Full identifier sent to mobile/auth/login/.
 * 0001 / kac-0001 / KAC-0001 → KAC-0001. Never KAC-KAC-0001.
 */
export function toMobileLoginIdentifier(suffixOrFull: string): string {
  const suffix = normalizeMobileLoginSuffix(suffixOrFull);
  if (!suffix) return "";
  if (isUnprefixedLegacyNumericId(suffix)) {
    return suffix;
  }
  return `${MOBILE_LOGIN_PREFIX}${suffix}`;
}

export function isValidMobileLoginIdentifier(identifier: string): boolean {
  const id = String(identifier ?? "").trim();
  if (!id) return false;
  if (isCanonicalEmployeeId(id)) return true;
  return isUnprefixedLegacyNumericId(id.toUpperCase());
}

/** Password is passed through unchanged — case-sensitive, no trim/case fold. */
export function buildMobileLoginBody(
  identifier: string,
  password: string
): { employee_id: string; password: string } | { username: string; password: string } {
  const trimmed = identifier.trim();
  if (usesEmployeeIdPayload(trimmed)) {
    return { employee_id: trimmed, password };
  }
  return { username: trimmed, password };
}
