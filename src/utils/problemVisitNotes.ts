import { formatCategoryDisplay, type ProblemItem } from "../api/problems";

export function buildProblemSeenText(options: {
  categoryCode?: string;
  categoryName?: string | null;
  item?: ProblemItem | null;
  otherText?: string;
  notes?: string;
}) {
  const parts: string[] = [];
  const categoryLabel = formatCategoryDisplay(options.categoryCode, options.categoryName);
  if (options.otherText?.trim()) {
    parts.push(options.otherText.trim());
  } else if (options.item) {
    const name = options.item.tamil_name
      ? `${options.item.name} (${options.item.tamil_name})`
      : options.item.name;
    parts.push(categoryLabel ? `${categoryLabel}: ${name}` : name);
  } else if (categoryLabel) {
    parts.push(categoryLabel);
  }
  if (options.notes?.trim()) {
    parts.push(options.notes.trim());
  }
  return parts.join(" — ");
}
