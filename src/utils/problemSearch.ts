import type { ProblemItem } from "../api/problems";
import { anyFieldStartsWithSearch } from "./prefixSearch";
import { categoryCodeFromValue } from "./problemItemFilter";

export function problemItemMatchesSearch(item: ProblemItem, query: string): boolean {
  return anyFieldStartsWithSearch(
    query,
    item.name,
    item.tamil_name,
    item.crop_name,
    item.category_code,
    item.category_name,
    categoryCodeFromValue(item.category)
  );
}
