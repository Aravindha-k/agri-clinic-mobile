import { memo, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import type { MapPinKind } from "./FieldMapView.types";

type Props = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  kind?: MapPinKind;
  label?: number | string;
  pending?: boolean;
  compact?: boolean;
  onPress?: () => void;
};

type MarkerStyle = {
  backgroundColor: string;
  borderColor: string;
  size: number;
  showIcon: boolean;
};

function resolveMarkerStyle(
  kind: MapPinKind | undefined,
  compact: boolean,
  pending?: boolean
): MarkerStyle {
  const queuedBorder = pending ? "#F59E0B" : "#FFFFFF";

  if (compact) {
    switch (kind) {
      case "route_start":
        return {
          backgroundColor: "#16A34A",
          borderColor: queuedBorder,
          size: 10,
          showIcon: false
        };
      case "visit":
        return {
          backgroundColor: "#16A34A",
          borderColor: queuedBorder,
          size: 10,
          showIcon: false
        };
      case "route_end":
        return {
          backgroundColor: "#DC2626",
          borderColor: "#FFFFFF",
          size: 10,
          showIcon: false
        };
      case "current":
        return {
          backgroundColor: "#2563EB",
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
        backgroundColor: "#16A34A",
        borderColor: "#FFFFFF",
        size: 18,
        showIcon: false
      };
    case "visit":
      return {
        backgroundColor: "#16A34A",
        borderColor: queuedBorder,
        size: labelSize(kind),
        showIcon: false
      };
    case "route_end":
      return {
        backgroundColor: "#DC2626",
        borderColor: "#FFFFFF",
        size: 18,
        showIcon: false
      };
    case "current":
      return {
        backgroundColor: "#2563EB",
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

function labelSize(kind: MapPinKind | undefined) {
  return kind === "visit" ? 22 : 16;
}

function FieldMapMarkerInner({
  id,
  latitude,
  longitude,
  title,
  description,
  kind,
  label,
  pending,
  compact = false,
  onPress
}: Props) {
  const style = resolveMarkerStyle(kind, compact, pending);
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
      onPress={onPress}
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
          },
          label != null && styles.shellLabeled
        ]}
      >
        {label != null ? (
          <Text style={[styles.label, compact && styles.labelCompact]}>{String(label)}</Text>
        ) : null}
      </View>
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
  },
  shellLabeled: {
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center"
  },
  labelCompact: {
    fontSize: 8
  }
});
