import * as Location from "expo-location";

function joinAddressParts(parts: Array<string | null | undefined>): string {
  const unique: string[] = [];
  for (const part of parts) {
    const value = String(part || "").trim();
    if (!value) continue;
    if (unique.some((existing) => existing.toLowerCase() === value.toLowerCase())) continue;
    unique.push(value);
  }
  return unique.join(", ");
}

/** Human-readable place for evidence stamps. Coordinates remain canonical if this fails. */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  try {
    const rows = await Location.reverseGeocodeAsync({ latitude, longitude });
    const row = rows[0];
    if (!row) return null;
    const line = joinAddressParts([
      row.name,
      row.street,
      row.district,
      row.subregion,
      row.city,
      row.region,
      row.country
    ]);
    return line || null;
  } catch {
    return null;
  }
}
