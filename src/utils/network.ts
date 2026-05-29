export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /no internet|network|failed to fetch|offline/i.test(error.message);
}
