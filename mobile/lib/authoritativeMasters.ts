import type { ProblemItem } from "../../src/api/problems";
import type { VisitFormValues } from "../../src/api/visits";
import {
  catalogFromMasters,
  idsFromRecords,
  validateVisitMasterFks,
  type MasterIdCatalog,
  type StaleMasterFkResult
} from "../../src/utils/staleMasterFks";
import { readCachedFormOptions, readStaleFormOptions } from "./formOptionsCache";
import {
  refreshAuthoritativeVisitFormOptions,
  type VisitFormOptions
} from "./visitFormOptionsApi";

export type AuthoritativeMasters = {
  options: VisitFormOptions;
  catalog: MasterIdCatalog;
  fromNetwork: boolean;
};

function optionsFromCache(): VisitFormOptions | null {
  return readCachedFormOptions<VisitFormOptions>() ?? readStaleFormOptions<VisitFormOptions>();
}

function toCatalog(options: VisitFormOptions, extraItems: ProblemItem[] = []): MasterIdCatalog {
  const items = [...(options.problem_items ?? []), ...extraItems];
  return catalogFromMasters({
    crops: options.crops,
    problemCategories: options.problem_categories,
    problemItems: items
  });
}

/** Current server catalogs when online; last village-independent master cache when offline. */
export async function resolveAuthoritativeMasters(options?: {
  online?: boolean;
  extraProblemItems?: ProblemItem[];
}): Promise<AuthoritativeMasters | null> {
  const extra = options?.extraProblemItems ?? [];
  if (options?.online !== false) {
    const fresh = await refreshAuthoritativeVisitFormOptions();
    if (fresh) {
      return {
        options: fresh,
        catalog: toCatalog(fresh, extra),
        fromNetwork: true
      };
    }
  }

  const cached = optionsFromCache();
  if (!cached) return null;
  return {
    options: cached,
    catalog: toCatalog(cached, extra),
    fromNetwork: false
  };
}

export function validateVisitAgainstAuthoritativeMasters(
  values: VisitFormValues,
  masters: AuthoritativeMasters | null
): StaleMasterFkResult {
  if (!masters) {
    const submitted = [
      values.problem_master_id,
      ...(values.problem_item_ids ?? [])
    ].filter((id) => id != null && String(id).trim() !== "");
    if (submitted.length) {
      return validateVisitMasterFks(values, { problemMasterIds: [] });
    }
    return { ok: true, stale: false, staleIds: [], message: null };
  }
  return validateVisitMasterFks(values, masters.catalog);
}

export function cachedProblemMasterIdSet(extraItems: ProblemItem[] = []): Set<string> {
  const cached = optionsFromCache();
  return idsFromRecords([...(cached?.problem_items ?? []), ...extraItems]);
}
