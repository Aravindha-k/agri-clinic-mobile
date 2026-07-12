import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import type { FieldMapViewProps } from "./FieldMapView.types";

const MIN_MAP_HEIGHT = 220;

type Props = Pick<
  FieldMapViewProps,
  | "screenName"
  | "height"
  | "width"
  | "loading"
  | "permissionResolved"
  | "emptyMessage"
  | "errorMessage"
> & {
  message: string;
  showSpinner?: boolean;
  showWarningIcon?: boolean;
  showMapIcon?: boolean;
};

export function FieldMapViewPlaceholder({
  screenName = "FieldMapView",
  height,
  width,
  message,
  showSpinner = false,
  showWarningIcon = false,
  showMapIcon = false
}: Props) {
  const { theme } = useTheme();
  const mapHeight = height > 0 ? height : MIN_MAP_HEIGHT;
  const shellWidth = Math.max(width, 1);
  const placeholderColor = theme.colors.muted ?? "#6B7F74";
  const shellBg = theme.colors.cardMuted ?? "#e8f0ea";

  return (
    <View
      style={[
        styles.shell,
        { height: mapHeight, width: shellWidth, minHeight: mapHeight, backgroundColor: shellBg }
      ]}
      accessibilityLabel={`${screenName} map placeholder`}
    >
      <View style={styles.placeholder}>
        {showSpinner ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : showWarningIcon ? (
          <Ionicons name="alert-circle-outline" size={32} color={theme.colors.warning ?? "#C2410C"} />
        ) : showMapIcon ? (
          <Ionicons name="map-outline" size={32} color={placeholderColor} />
        ) : null}
        {showWarningIcon ? (
          <Text style={[styles.placeholderTitle, { color: theme.colors.text }]}>Map unavailable</Text>
        ) : null}
        <Text style={[styles.placeholderText, { color: placeholderColor }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "center",
    borderRadius: 18,
    overflow: "hidden"
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    minHeight: MIN_MAP_HEIGHT,
    padding: 20
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  }
});
