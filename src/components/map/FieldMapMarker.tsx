import { memo, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
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
  showIcon: boolean;
};

function resolveMarkerStyle(kind: MapPinKind | undefined, compact: boolean): MarkerStyle {
  if (compact) {
    switch (kind) {
      case "route_start":
        return {
          backgroundColor: "#D97706",
          borderColor: "#FFFFFF",
          size: 10,
          showIcon: false
        };
      case "visit":
        return {
          backgroundColor: "#16A34A",
          borderColor: "#FFFFFF",
          size: 10,
          showIcon: false
        };
      default:
        return {
          backgroundColor: "#0B5A38",
          borderColor: "#FFFFFF",
          size: 10,
          showIcon: false
        };
    }
  }

  switch (kind) {
    case "route_start":
      return {
        backgroundColor: "#D97706",
        borderColor: "#FFFFFF",
        size: 18,
        showIcon: false
      };
    case "visit":
      return {
        backgroundColor: "#16A34A",
        borderColor: "#FFFFFF",
        size: 16,
        showIcon: false
      };
    case "route_end":
      return {
        backgroundColor: "#C2410C",
        borderColor: "#FFFFFF",
        size: 18,
        showIcon: false
      };
    case "farmer":
      return {
        backgroundColor: "#15803D",
        borderColor: "#FFFFFF",
        size: 18,
        showIcon: false
      };
    default:
      return {
        backgroundColor: "#0B5A38",
        borderColor: "#FFFFFF",
        size: 16,
        showIcon: false
      };
  }
}

function FieldMapMarkerInner({ id, latitude, longitude, title, description, kind, compact = false }: Props) {
  const style = resolveMarkerStyle(kind, compact);
  const [tracksViewChanges, setTracksViewChanges] = useState(Platform.OS === "android");

  useEffect(() => {
    if (!tracksViewChanges) return;
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, [tracksViewChanges]);

  return (
    <Marker
      identifier={id}
      coordinate={{ latitude, longitude }}
      title={title}
      description={description}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      zIndex={5}
    >
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
