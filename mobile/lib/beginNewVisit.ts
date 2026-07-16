import type { Farmer } from "../../src/api/farmers";
import type { VisitFormPrefill } from "../../src/utils/farmerPrefill";
import { useVisitFormStore } from "../store/visitFormStore";
import { deletePersistedPhoto } from "./media/persistentVisitPhotos";

export type BeginNewVisitOptions = {
  /** Pre-select farmer only when intentionally passed (e.g. farmer detail with explicit farmer). */
  farmer?: Farmer | null;
  /** Farmer identity from navigation prefill — does not copy prior visit fields. */
  farmerPrefill?: VisitFormPrefill;
  step?: 1 | 2 | 3 | 4;
  visitKind?: "first" | "revisit";
  /** When true, discard copied temporary media from the previous draft. */
  discardMedia?: boolean;
};

function farmerFromPrefill(prefill: VisitFormPrefill): Farmer | null {
  const id = prefill.farmer_id?.trim();
  if (!id || !/^\d+$/.test(id)) return null;
  return { id: Number(id), name: prefill.farmer_name || "" };
}

async function cleanupDraftMedia() {
  const state = useVisitFormStore.getState();
  const uris = [
    ...state.photos.map((p) => p.uri),
    ...state.extraAttachments.map((a) => a.uri).filter((uri): uri is string => typeof uri === "string")
  ].filter((uri) => uri.includes("pending-visit-media"));
  await Promise.all(uris.map((uri) => deletePersistedPhoto(uri).catch(() => undefined)));
}

/**
 * Central entry for a clean visit draft. Clears all step fields, photos, GPS, and advice.
 * Assigns one stable local_sync_id for the new draft (preserved across steps/restart).
 * Does not affect submitted visit summaries passed via navigation params.
 */
export function beginNewVisit(options?: BeginNewVisitOptions) {
  const store = useVisitFormStore.getState();
  if (options?.discardMedia) {
    void cleanupDraftMedia();
  }
  store.reset();
  store.ensureLocalSyncId();

  const farmer = options?.farmer ?? (options?.farmerPrefill ? farmerFromPrefill(options.farmerPrefill) : null);
  if (farmer) {
    store.setFarmer(farmer);
    store.setVisitKind(options?.visitKind ?? "first");
    store.setStep(options?.step ?? 2);
    return;
  }

  if (options?.step) {
    store.setStep(options.step);
  }
}
