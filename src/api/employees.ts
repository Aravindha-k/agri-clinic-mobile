import { apiClient } from "./client";
import { ApiRequestError } from "../utils/apiError";
import { extractPhotoUrl } from "../utils/profilePhotoUrl";

export type Employee = {
  id: number;
  profile_id?: number;
  name?: string;
  full_name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  employee_id?: string | null;
  photo_url?: string | null;
  profile_photo_url?: string | null;
  profile_photo_updated_at?: string | null;
  profile_photo?: string | null;
  photo?: string | null;
};

/** Prefer mobile auth/me (includes profile_photo_url); fallback only when mobile route is missing. */
export async function getCurrentEmployee(): Promise<Employee> {
  try {
    const row = await apiClient<Employee>("mobile/auth/me/");
    if (extractPhotoUrl(row)) {
      return row;
    }
    try {
      const fallback = await apiClient<Employee>("employees/me/");
      return extractPhotoUrl(fallback) ? fallback : row;
    } catch {
      return row;
    }
  } catch (mobileErr) {
    if (mobileErr instanceof ApiRequestError && mobileErr.status === 404) {
      return apiClient<Employee>("employees/me/");
    }
    throw mobileErr;
  }
}

export function isFieldEmployee(employee: Employee | null | undefined) {
  if (!employee?.employee_id) {
    return false;
  }

  const role = (employee.role || "").toLowerCase();
  if (["admin", "superadmin", "super_admin", "manager"].includes(role)) {
    return false;
  }

  return role === "employee" || role.includes("field") || role.includes("agent") || role.includes("officer");
}

/** Merge upload response photo fields onto an employee row. */
export function mergeEmployeePhoto(
  employee: Employee | null,
  patch: {
    profile_photo_url?: string | null;
    profile_photo_updated_at?: string | null;
    photo_url?: string | null;
  } | null
): Employee | null {
  if (!employee || !patch) return employee;
  const url = patch.profile_photo_url ?? patch.photo_url ?? extractPhotoUrl(patch);
  if (!url && !patch.profile_photo_updated_at) return employee;
  return {
    ...employee,
    profile_photo_url: url ?? employee.profile_photo_url,
    profile_photo_updated_at: patch.profile_photo_updated_at ?? employee.profile_photo_updated_at,
    photo_url: url ?? employee.photo_url
  };
}
