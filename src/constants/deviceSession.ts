export const DEVICE_SESSION_HEADER = "X-Device-Session";

export const SESSION_REPLACED_CODE = "SESSION_REPLACED";

/** @deprecated Backend now returns SESSION_REPLACED */
export const DEVICE_SESSION_CONFLICT_CODE = "DEVICE_SESSION_CONFLICT";

export const SESSION_REPLACED_MESSAGE =
  "You were logged out because this account was used on another device.";

/** @deprecated Use SESSION_REPLACED_MESSAGE */
export const DEVICE_SESSION_CONFLICT_MESSAGE = SESSION_REPLACED_MESSAGE;

export const SESSION_REPLACED_CODES = new Set([SESSION_REPLACED_CODE, DEVICE_SESSION_CONFLICT_CODE]);
