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
  text?: string;
};

function resolveMarkerStyle(
  kind: MapPinKind | undefined,
  compact: boolean,
  pending?: boolean,
  label?: number | string
): MarkerStyle {
  const queuedBorder = pending ? "#F59E0B" : "#FFFFFF";

  if (compact) {
    switch (kind) {
      case "route_start":
        return { backgroundColor: "#16A34A", borderColor: "#FFFFFF", size: 12, text: "S" };
      case "visit":
        return {
          backgroundColor: pending ? "#D97706" : "#0B6B3A",
          borderColor: queuedBorder,
          size: 12,
          text: label != null ? String(label) : undefined
        };
      case "route_end":
        return { backgroundColor: "#DC2626", borderColor: "#FFFFFF", size: 12, text: "E" };
      case "current":
        return { backgroundColor: "#2563EB", borderColor: "#FFFFFF", size: 10 };
      default:
        return { backgroundColor: "#0B5A38", borderColor: "#FFFFFF", size: 10 };
    }
  }

  switch (kind) {
    case "route_start":
      return {
        backgroundColor: "#16A34A",
        borderColor: "#FFFFFF",
        size: 30,
        text: "S"
      };
    case "visit":
      return {
        backgroundColor: pending ? "#D97706" : "#0B6B3A",
        borderColor: queuedBorder,
        size: 28,
        text: label != null ? String(label) : "✓"
      };
    case "route_end":
      return {
        backgroundColor: "#DC2626",
        borderColor: "#FFFFFF",
        size: 30,
        text: "E"
      };
    case "current":
      return {
        backgroundColor: "#2563EB",
        borderColor: "#FFFFFF",
        size: 22,
        text: undefined
      };
    case "farmer":
      return {
        backgroundColor: "#15803D",
        borderColor: "#FFFFFF",
        size: 20
      };
    default:
      return {
        backgroundColor: "#0B5A38",
        borderColor: "#FFFFFF",
        size: 16,
        text: label != null ? String(label) : undefined
      };
  }
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
  const style = resolveMarkerStyle(kind, compact, pending, label);
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
      zIndex={
        kind === "current" ? 12 : kind === "route_start" || kind === "route_end" ? 8 : 5
      }
      draggable={false}
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
          }
        ]}
      >
        {style.text ? (
          <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
            {style.text}
          </Text>
        ) : null}
      </View>
    </Marker>
  );
}

export const FieldMapMarker = memo(FieldMapMarkerInner);

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    borderWidth: 2.5,
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.28,
        shadowRadius: 2.5
      },
      android: {
        elevation: 5
      }
    })
  },
  shellCompact: {
    borderWidth: 1.5
  },
  label: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  labelCompact: {
    fontSize: 8
  }
});
