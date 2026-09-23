import type { ProblemCategory, ProblemItem } from "../api/problems";
import type { MasterOption } from "../api/masters";
import type { VisitFormValues } from "../api/visits";
import { extractMasterPk } from "./masterId";

export const STALE_PROBLEM_MASTER_MESSAGE =
  "One or more selected problems are no longer available. Please review and select the problem again.";

export const STALE_CROP_MASTER_MESSAGE =
  "The selected crop is no longer available. Please select the crop again.";

export const STALE_PROBLEM_CATEGORY_MESSAGE =
  "Problem data has changed. Please select the problem again.";

export type MasterIdCatalog = {
  cropIds?: Iterable<string | number>;
  problemCategoryIds?: Iterable<string | number>;
  problemMasterIds?: Iterable<string | number>;
};

export type StaleMasterFkResult = {
  ok: boolean;
  stale: boolean;
  field?: "crop" | "problem_category" | "problem_master";
  staleIds: string[];
  message: string | null;
};

export function toMasterIdSet(ids: Iterable<string | number> | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!ids) return out;
  for (const raw of ids) {
    const pk = extractMasterPk(raw);
    if (pk != null) out.add(String(pk));
  }
  return out;
}

export function idsFromRecords(rows: Array<{ id?: string | number | null }> | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!rows) return out;
  for (const row of rows) {
    const pk = extractMasterPk(row?.id);
    if (pk != null) out.add(String(pk));
  }
  return out;
}

export function isKnownMasterId(
  id: string | number | null | undefined,
  validIds: Iterable<string | number> | null | undefined
): boolean {
  const pk = extractMasterPk(id);
  if (pk == null) return false;
  return toMasterIdSet(validIds).has(String(pk));
}

export type DraftProblemSelection = {
  problemMasterId?: string | null;
  pendingProblemMasterId?: string | null;
  selectedProblems?: ProblemItem[] | null;
  selectedProblem?: ProblemItem | null;
  problemCategoryId?: string | null;
  problemCategoryCode?: string | null;
};

export type ReconciledProblemSelection = DraftProblemSelection & {
  needsProblemReview: boolean;
  staleIds: string[];
};

/** Drop selected/pending Problem Master IDs that are not in the current valid set. */
export function reconcileDraftProblemSelection(
  draft: DraftProblemSelection,
  validProblemMasterIds: Iterable<string | number> | null | undefined
): ReconciledProblemSelection {
  const valid = toMasterIdSet(validProblemMasterIds);
  if (valid.size === 0) {
    return {
      selectedProblems: draft.selectedProblems ?? [],
      selectedProblem: draft.selectedProblem ?? null,
      problemMasterId: draft.problemMasterId ?? "",
      pendingProblemMasterId: draft.pendingProblemMasterId ?? "",
      problemCategoryId: draft.problemCategoryId ?? "",
      problemCategoryCode: draft.problemCategoryCode ?? "",
      needsProblemReview: false,
      staleIds: []
    };
  }
  const staleIds: string[] = [];

  const kept = (draft.selectedProblems ?? []).filter((item) => {
    const pk = extractMasterPk(item.id);
    if (pk != null && valid.has(String(pk))) return true;
    if (pk != null) staleIds.push(String(pk));
    return false;
  });

  const selectedPk = extractMasterPk(draft.selectedProblem?.id);
  const selectedProblem =
    selectedPk != null && valid.has(String(selectedPk))
      ? draft.selectedProblem ?? kept[0] ?? null
      : kept[0] ?? null;
  if (selectedPk != null && !valid.has(String(selectedPk))) {
    staleIds.push(String(selectedPk));
  }

  const masterPk = extractMasterPk(draft.problemMasterId);
  const pendingPk = extractMasterPk(draft.pendingProblemMasterId);
  if (masterPk != null && !valid.has(String(masterPk))) staleIds.push(String(masterPk));
  if (pendingPk != null && !valid.has(String(pendingPk))) staleIds.push(String(pendingPk));

  const uniqueStale = [...new Set(staleIds)];
  const primary = kept[0] ?? selectedProblem;
  const needsProblemReview = uniqueStale.length > 0;

  return {
    selectedProblems: kept,
    selectedProblem: primary ?? null,
    problemMasterId: primary ? String(primary.id) : "",
    pendingProblemMasterId: primary ? String(primary.id) : "",
    problemCategoryId: kept.length ? draft.problemCategoryId : "",
    problemCategoryCode: kept.length ? draft.problemCategoryCode : "",
    needsProblemReview,
    staleIds: uniqueStale
  };
}

export function collectSubmittedProblemMasterIds(values: Pick<
  VisitFormValues,
  "problem_master_id" | "problem_item_ids"
>): string[] {
  const ids: string[] = [];
  const master = extractMasterPk(values.problem_master_id);
  if (master != null) ids.push(String(master));
  for (const raw of values.problem_item_ids ?? []) {
    const pk = extractMasterPk(raw);
    if (pk != null) ids.push(String(pk));
  }
  return [...new Set(ids)];
}

/**
 * Validate Mobile-controlled master FKs against the currently known catalog.
 * If `problemMasterIds` is empty/undefined, validity cannot be established for any submitted problem ID.
 */
export function validateVisitMasterFks(
  values: VisitFormValues,
  catalog: MasterIdCatalog
): StaleMasterFkResult {
  const cropIds = catalog.cropIds ? toMasterIdSet(catalog.cropIds) : null;
  const categoryIds = catalog.problemCategoryIds ? toMasterIdSet(catalog.problemCategoryIds) : null;
  const problemIds = catalog.problemMasterIds ? toMasterIdSet(catalog.problemMasterIds) : null;

  const cropPk = extractMasterPk(values.crop);
  if (cropPk != null && cropIds && cropIds.size > 0 && !cropIds.has(String(cropPk))) {
    return {
      ok: false,
      stale: true,
      field: "crop",
      staleIds: [String(cropPk)],
      message: STALE_CROP_MASTER_MESSAGE
    };
  }

  const categoryPk = extractMasterPk(values.problem_category_id);
  if (categoryPk != null && categoryIds && categoryIds.size > 0 && !categoryIds.has(String(categoryPk))) {
    return {
      ok: false,
      stale: true,
      field: "problem_category",
      staleIds: [String(categoryPk)],
      message: STALE_PROBLEM_CATEGORY_MESSAGE
    };
  }

  const submittedProblemIds = collectSubmittedProblemMasterIds(values);
  if (submittedProblemIds.length) {
    if (!problemIds || problemIds.size === 0) {
      return {
        ok: false,
        stale: true,
        field: "problem_master",
        staleIds: submittedProblemIds,
        message: STALE_PROBLEM_MASTER_MESSAGE
      };
    }
    const missing = submittedProblemIds.filter((id) => !problemIds.has(id));
    if (missing.length) {
      return {
        ok: false,
        stale: true,
        field: "problem_master",
        staleIds: missing,
        message: STALE_PROBLEM_MASTER_MESSAGE
      };
    }
  }

  return { ok: true, stale: false, staleIds: [], message: null };
}

export function catalogFromMasters(options: {
  crops?: MasterOption[];
  problemCategories?: ProblemCategory[];
  problemItems?: ProblemItem[];
}): MasterIdCatalog {
  return {
    cropIds: idsFromRecords(options.crops),
    problemCategoryIds: idsFromRecords(options.problemCategories),
    problemMasterIds: idsFromRecords(options.problemItems)
  };
}

const INVALID_PK_RE = /invalid pk\s*["']?(\d+)["']?/i;

export function isStaleMasterPkError(input: unknown): boolean {
  const text = stringifyErrorBody(input);
  if (!text) return false;
  const mentionsProblemMaster = /problem[_ ]master|problem[_ ]item|problem[_ ]category/i.test(text);
  if (INVALID_PK_RE.test(text) && mentionsProblemMaster) return true;
  if (/invalid pk/i.test(text) && /object does not exist/i.test(text) && mentionsProblemMaster) {
    return true;
  }
  return false;
}

export function friendlyStaleMasterMessage(input: unknown): string | null {
  if (!isStaleMasterPkError(input)) return null;
  return STALE_PROBLEM_MASTER_MESSAGE;
}

function stringifyErrorBody(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input;
  if (input instanceof Error) return `${input.message} ${JSON.stringify((input as { data?: unknown }).data ?? "")}`;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}
