import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../theme";
import type { FieldMapViewProps } from "./FieldMapView.types";

const MIN_MAP_HEIGHT = 220;

export type { MapCoordinate, MapPin } from "./FieldMapView.types";

export function FieldMapView({ height, width }: FieldMapViewProps) {
  const { theme } = useTheme();
  const mapHeight = Math.max(height, MIN_MAP_HEIGHT);
  const shellWidth = Math.max(width, 1);

  return (
    <View style={[styles.shell, { height: mapHeight, width: shellWidth, backgroundColor: theme.colors.cardMuted }]}>
      <Text style={styles.placeholderText}>Map available on Android/iOS app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 18,
    justifyContent: "center",
    overflow: "hidden",
    padding: 20
  },
  placeholderText: {
    color: "#6B7F74",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  }
});
