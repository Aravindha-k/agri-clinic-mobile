import { Image, type ImageSourcePropType } from "react-native";
import { SPLASH_ASSETS } from "../components/brand/splashAssets";

export type SplashAssetReport = {
  key: string;
  width: number;
  height: number;
  uri: string;
};

function resolveOne(key: string, source: ImageSourcePropType): SplashAssetReport {
  const resolved = Image.resolveAssetSource(source);
  if (!resolved?.uri || !resolved.width || !resolved.height) {
    throw new Error(`[SplashAssets] missing or invalid: ${key}`);
  }
  return {
    key,
    width: resolved.width,
    height: resolved.height,
    uri: resolved.uri
  };
}

/** Validates bundled premium splash assets — throws in dev if broken. */
export function validateSplashAssets(): SplashAssetReport[] {
  return [
    resolveOne("background", SPLASH_ASSETS.background),
    resolveOne("logo", SPLASH_ASSETS.logo)
  ];
}

export function logSplashAssets(): SplashAssetReport[] {
  const reports = validateSplashAssets();
  console.warn("[KavyaCinematicSplash] asset validation OK");
  for (const row of reports) {
    console.warn(`[KavyaCinematicSplash] ${row.key} ${row.width}×${row.height} ${row.uri}`);
  }
  return reports;
}
