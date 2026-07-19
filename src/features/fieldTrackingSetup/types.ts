/** Versioned field-tracking permission onboarding. */

export const FIELD_TRACKING_SETUP_VERSION = 1;

export type SetupStepId =
  | "foreground"
  | "background"
  | "precise"
  | "battery"
  | "oem"
  | "notifications";

export type SetupStepStatus = "pending" | "active" | "done" | "needs_attention" | "skipped";

export type SetupStepState = {
  id: SetupStepId;
  status: SetupStepStatus;
  /** Short employee-facing label */
  label: string;
  required: boolean;
};

export type FieldTrackingProbe = {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  /** When unsupported or unknown, treat as true if foreground granted. */
  preciseOk: boolean;
  notificationsGranted: boolean;
  notificationsRequired: boolean;
  batteryUnrestricted: boolean | null;
  /** OEM guidance only — never blocks completion. */
  oemGuidedDone: boolean;
  batteryGuidedDone: boolean;
  expoGoLimited: boolean;
  apiLevel: number | null;
  manufacturerFamily: ManufacturerFamily;
};

export type ManufacturerFamily =
  | "xiaomi"
  | "oppo"
  | "realme"
  | "vivo"
  | "samsung"
  | "oneplus"
  | "motorola"
  | "other"
  | "ios"
  | "unknown";

export type FieldTrackingSetupRecord = {
  schemaVersion: number;
  completedAt: string | null;
  batteryGuidedCompleted: boolean;
  oemGuidedCompleted: boolean;
  lastCompletedVersion: number | null;
  /** Snapshot only — Android current permission state remains authoritative. */
  foregroundGranted?: boolean;
  preciseLocationConfirmed?: boolean;
  backgroundGranted?: boolean;
  notificationGranted?: boolean;
  batteryGuidanceCompleted?: boolean;
  oemGuidanceCompleted?: boolean;
  /** True when FG looks temporary (e.g. Only this time) without lasting BG. */
  temporaryForegroundLikely?: boolean;
  lastProbedAt?: string | null;
};

export type FieldTrackingHealth = {
  ready: boolean;
  missing: SetupStepId[];
  probe: FieldTrackingProbe;
  setupCompleted: boolean;
};
