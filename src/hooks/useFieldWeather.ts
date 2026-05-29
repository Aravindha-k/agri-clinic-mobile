import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type FieldWeather = {
  tempC: number;
  label: string;
  code: number;
};

const FALLBACK_LAT = 11.1271;
const FALLBACK_LNG = 78.6569;
const FETCH_TIMEOUT_MS = 15000;

function weatherFromCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunderstorm";
  return "Cloudy";
}

function weatherIconName(code: number): IoniconName {
  if (code === 0) return "sunny";
  if (code <= 3) return "partly-sunny";
  if (code <= 48) return "cloudy";
  if (code <= 67) return "rainy";
  if (code <= 82) return "rainy-outline";
  if (code <= 99) return "thunderstorm";
  return "cloud-outline";
}

function parseCoords(latitude?: string | number | null, longitude?: string | number | null) {
  const la = latitude != null && latitude !== "" ? Number(latitude) : NaN;
  const lo = longitude != null && longitude !== "" ? Number(longitude) : NaN;
  if (Number.isFinite(la) && Number.isFinite(lo)) {
    return { lat: la, lng: lo };
  }
  return { lat: FALLBACK_LAT, lng: FALLBACK_LNG };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWeather(lat: number, lng: number): Promise<FieldWeather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const temp = data.current?.temperature_2m;
  const code = data.current?.weather_code ?? 0;
  if (typeof temp !== "number" || !Number.isFinite(temp)) return null;
  return { tempC: Math.round(temp), label: weatherFromCode(code), code };
}

export function useFieldWeather(latitude?: string | number | null, longitude?: string | number | null) {
  const [weather, setWeather] = useState<FieldWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { lat, lng } = parseCoords(latitude, longitude);
      const result = await fetchWeather(lat, lng);
      setWeather(result);
      if (!result) setError(true);
    } catch {
      setWeather(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return {
    weather,
    loading,
    error,
    refresh: load,
    iconName: weather ? weatherIconName(weather.code) : "partly-sunny"
  };
}

export { weatherIconName };
