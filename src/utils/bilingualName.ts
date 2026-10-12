/**
 * Shared bilingual display formatting for master-data names.
 * Tamil first, English second, joined by " / " as ONE combined label.
 * Single-language fallback: never emits an empty separator.
 */
export function bilingualLabel(english?: string | null, tamil?: string | null): string {
  const en = (english ?? "").trim();
  const ta = (tamil ?? "").trim();
  if (ta && en && ta !== en) return `${ta} / ${en}`;
  return ta || en;
}
