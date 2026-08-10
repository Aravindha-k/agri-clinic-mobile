/** Employee account deactivated by admin — backend is source of truth. */

export const EMPLOYEE_INACTIVE_CODES = new Set([
  "EMPLOYEE_INACTIVE",
  "ACCOUNT_DISABLED"
]);

export const EMPLOYEE_INACTIVE_MESSAGE =
  "Your account has been deactivated. Please contact your administrator.";

export function isEmployeeInactiveCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return EMPLOYEE_INACTIVE_CODES.has(String(code).trim().toUpperCase());
}
