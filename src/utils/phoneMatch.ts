export function normalizePhoneDigits(phone?: string | null) {
  return (phone ?? "").replace(/\D/g, "");
}

export function phonesMatch(a?: string | null, b?: string | null) {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) {
    return false;
  }
  if (da === db) {
    return true;
  }
  const tailA = da.slice(-10);
  const tailB = db.slice(-10);
  return tailA.length >= 10 && tailA === tailB;
}
