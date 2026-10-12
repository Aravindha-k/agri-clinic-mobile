/**
 * Pure helpers for Step 2 crop + problem selection.
 * Kept dependency-free so node tests can exercise the real implementation.
 */

export type CropMasterRow = {
  id: number | string;
  name_en?: string | null;
  name_ta?: string | null;
  name?: string | null;
  is_active?: boolean | null;
};

export type FarmerCropChip = {
  /** Crop-master primary key as a string. */
  crop_id: string;
  crop_name: string;
  crop_name_ta?: string;
  field_name?: string;
};

function positivePk(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "object") {
    return positivePk((value as { id?: unknown }).id);
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const pk = Number(text);
  return Number.isSafeInteger(pk) && pk > 0 ? pk : null;
}

/**
 * Crop-master PK referenced by a FieldCrop row (`crop` FK, or `crop_id` alias).
 * Never falls back to the FieldCrop row's own `id`.
 */
export function cropMasterPkFromFieldCrop(row: Record<string, unknown>): number | null {
  return positivePk(row.crop_id) ?? positivePk(row.crop);
}

export function cropMasterLabel(crop: CropMasterRow): string {
  return (crop.name_en || crop.name || crop.name_ta || "").trim();
}

function activeCropMap(crops: CropMasterRow[]): Map<number, CropMasterRow> {
  const map = new Map<number, CropMasterRow>();
  for (const crop of crops) {
    if (crop.is_active === false) continue;
    const pk = positivePk(crop.id);
    if (pk != null && cropMasterLabel(crop)) map.set(pk, crop);
  }
  return map;
}

function chipFor(crop: CropMasterRow, pk: number, fieldName?: string): FarmerCropChip {
  const ta = crop.name_ta?.trim();
  const label = cropMasterLabel(crop);
  return {
    crop_id: String(pk),
    crop_name: label,
    crop_name_ta: ta && ta !== label ? ta : undefined,
    field_name: fieldName || undefined
  };
}

/** Farmer's field crops that resolve to an active crop-master row, de-duplicated by crop. */
export function resolveFarmerCropChips(fields: unknown[], activeCrops: CropMasterRow[]): FarmerCropChip[] {
  const active = activeCropMap(activeCrops);
  const chips: FarmerCropChip[] = [];
  const seen = new Set<number>();
  for (const field of fields) {
    if (!field || typeof field !== "object") continue;
    const row = field as Record<string, unknown>;
    if (row.is_active === false) continue;
    const fieldName = String(row.land_name || row.field_name || row.name || "").trim();
    const cropRows = row.crops ?? row.field_crops ?? row.current_crops;
    if (!Array.isArray(cropRows)) continue;
    for (const raw of cropRows) {
      if (!raw || typeof raw !== "object") continue;
      const fieldCrop = raw as Record<string, unknown>;
      if (fieldCrop.is_active === false) continue;
      const pk = cropMasterPkFromFieldCrop(fieldCrop);
      if (pk == null || seen.has(pk)) continue;
      const master = active.get(pk);
      if (!master) continue;
      seen.add(pk);
      chips.push(chipFor(master, pk, fieldName));
    }
  }
  return chips;
}

function normalizeName(value?: string | null): string {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Match a farmer-level crop name (e.g. "Paddy" or "Paddy / நெல்") to an active crop master. */
export function resolveCropChipByName(name: string | null | undefined, activeCrops: CropMasterRow[]): FarmerCropChip | null {
  const target = normalizeName(name);
  if (!target) return null;
  for (const [pk, crop] of activeCropMap(activeCrops)) {
    const en = normalizeName(crop.name_en || crop.name);
    const ta = normalizeName(crop.name_ta);
    const candidates = [en, ta, en && ta ? `${en} / ${ta}` : ""].filter(Boolean);
    if (candidates.includes(target)) return chipFor(crop, pk);
  }
  return null;
}

/** Keep only selections whose id is in the crop's allowed problem list. */
export function restrictProblemsToAllowed<T extends { id: number | string }>(
  selected: T[],
  allowedIds: Iterable<string | number>
): { kept: T[]; removed: T[] } {
  const allowed = new Set(Array.from(allowedIds, (id) => String(id)));
  const kept: T[] = [];
  const removed: T[] = [];
  for (const item of selected) {
    if (allowed.has(String(item.id))) kept.push(item);
    else removed.push(item);
  }
  return { kept, removed };
}
