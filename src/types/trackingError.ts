/** Structured tracking / workday error sources for Day and Tracking screens. */
export type TrackingErrorSource =
  | "start_workday"
  | "tracking"
  | "visit_location"
  | "end_workday"
  | "sync";

export type TrackingErrorState = {
  source: TrackingErrorSource;
  message: string;
} | null;

export function trackingErrorMessage(state: TrackingErrorState): string {
  return state?.message ?? "";
}

export function trackingErrorSource(state: TrackingErrorState): TrackingErrorSource | null {
  return state?.source ?? null;
}
