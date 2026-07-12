import { Marker } from "@maplibre/maplibre-react-native";
import { memo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import type { MapPinKind } from "./FieldMapView.types";

type Props = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  kind?: MapPinKind;
  compact?: boolean;
};

type MarkerStyle = {
  backgroundColor: string;
  borderColor: string;
  size: number;
};

function resolveMarkerStyle(kind: MapPinKind | undefined, compact: boolean): MarkerStyle {
  if (compact) {
    switch (kind) {
      case "route_start":
        return { backgroundColor: "#D97706", borderColor: "#FFFFFF", size: 10 };
      case "visit":
        return { backgroundColor: "#16A34A", borderColor: "#FFFFFF", size: 10 };
      default:
        return { backgroundColor: "#0B5A38", borderColor: "#FFFFFF", size: 10 };
    }
  }

  switch (kind) {
    case "route_start":
      return { backgroundColor: "#D97706", borderColor: "#FFFFFF", size: 18 };
    case "visit":
      return { backgroundColor: "#16A34A", borderColor: "#FFFFFF", size: 16 };
    case "route_end":
      return { backgroundColor: "#C2410C", borderColor: "#FFFFFF", size: 18 };
    case "farmer":
      return { backgroundColor: "#15803D", borderColor: "#FFFFFF", size: 18 };
    default:
      return { backgroundColor: "#0B5A38", borderColor: "#FFFFFF", size: 16 };
  }
}

function FieldMapMarkerInner({ id, latitude, longitude, kind, compact = false }: Props) {
  const style = resolveMarkerStyle(kind, compact);

  return (
    <Marker id={id} lngLat={[longitude, latitude]} anchor="center">
      <View
        style={[
          styles.shell,
          compact && styles.shellCompact,
          {
            width: style.size,
            height: style.size,
            borderRadius: style.size / 2,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor
          }
        ]}
      />
    </Marker>
  );
}

export const FieldMapMarker = memo(FieldMapMarkerInner);

const styles = StyleSheet.create({
  shell: {
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 2
      },
      android: {
        elevation: 3
      }
    })
  },
  shellCompact: {
    borderWidth: 1.5
  }
});
