import { en, type TranslationTree } from "./en";
import { ta } from "./ta";

export type AppLanguage = "en" | "ta";

const catalogs: Record<AppLanguage, TranslationTree> = { en: en as TranslationTree, ta };

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }
  return out;
}

function lookup(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = tree;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(
  language: AppLanguage,
  key: string,
  params?: Record<string, string | number>
): string {
  const primary = lookup(catalogs[language], key);
  if (primary) return interpolate(primary, params);
  const fallback = lookup(catalogs.en, key);
  if (fallback) return interpolate(fallback, params);
  return key;
}

export function formatRelativeTimeLocalized(
  language: AppLanguage,
  iso?: string | null
): string {
  if (!iso) return translate(language, "common.never");
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return translate(language, "common.unknown");
  const diffMs = Date.now() - then;
  if (diffMs < 0) return translate(language, "common.justNow");
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return translate(language, "common.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return translate(language, min === 1 ? "common.minutesAgo" : "common.minutesAgo_plural", {
      count: min
    });
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return translate(language, hr === 1 ? "common.hoursAgo" : "common.hoursAgo_plural", { count: hr });
  }
  const day = Math.floor(hr / 24);
  if (day < 7) {
    return translate(language, day === 1 ? "common.daysAgo" : "common.daysAgo_plural", { count: day });
  }
  const locale = language === "ta" ? "ta-IN" : "en-IN";
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}
