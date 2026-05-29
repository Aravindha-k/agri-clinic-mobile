import { Linking, Platform } from "react-native";

type OpenDirectionsParams = {
  latitude: number;
  longitude: number;
  label?: string;
};

/** Opens native maps for turn-by-turn navigation to a destination. */
export async function openMapDirections({ latitude, longitude, label }: OpenDirectionsParams): Promise<void> {
  const destination = `${latitude},${longitude}`;
  const encodedLabel = encodeURIComponent(label?.trim() || "Farmer Location");
  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

  if (Platform.OS === "ios") {
    await Linking.openURL(`http://maps.apple.com/?daddr=${destination}&q=${encodedLabel}`);
    return;
  }

  if (Platform.OS === "android") {
    try {
      await Linking.openURL(`google.navigation:q=${destination}`);
      return;
    } catch {
      // fall through to web / geo URL
    }
    try {
      await Linking.openURL(`geo:0,0?q=${destination}(${encodedLabel})`);
      return;
    } catch {
      // fall through
    }
  }

  await Linking.openURL(webFallback);
}
