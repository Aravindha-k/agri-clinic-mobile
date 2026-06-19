import { Ionicons } from "@expo/vector-icons";
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
};

type MarkerStyle = {
  backgroundColor: string;
  borderColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  size: number;
};

function resolveMarkerStyle(kind: MapPinKind | undefined): MarkerStyle {
  switch (kind) {
    case "current":
      return {
        backgroundColor: "#2196F3",
        borderColor: "#FFFFFF",
        icon: "navigate",
        iconColor: "#FFFFFF",
        size: 38
      };
    case "route_start":
      return {
        backgroundColor: "#0B5A38",
        borderColor: "#FFFFFF",
        icon: "flag",
        iconColor: "#FFFFFF",
        size: 36
      };
    case "route_end":
      return {
        backgroundColor: "#C2410C",
        borderColor: "#FFFFFF",
        icon: "flag",
        iconColor: "#FFFFFF",
        size: 36
      };
    case "farmer":
      return {
        backgroundColor: "#15803D",
        borderColor: "#FFFFFF",
        icon: "leaf",
        iconColor: "#FFFFFF",
        size: 38
      };
    case "visit":
      return {
        backgroundColor: "#0F766E",
        borderColor: "#FFFFFF",
        icon: "location",
        iconColor: "#FFFFFF",
        size: 38
      };
    case "checkin":
      return {
        backgroundColor: "#6D28D9",
        borderColor: "#FFFFFF",
        icon: "time",
        iconColor: "#FFFFFF",
        size: 34
      };
    default:
      return {
        backgroundColor: "#0B5A38",
        borderColor: "#FFFFFF",
        icon: "location",
        iconColor: "#FFFFFF",
        size: 34
      };
  }
}

function FieldMapMarkerInner({ id, latitude, longitude, title, description, kind }: Props) {
  const style = resolveMarkerStyle(kind);
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
      zIndex={kind === "current" ? 10 : 5}
    >
      <View
        style={[
          styles.shell,
          {
            width: style.size,
            height: style.size,
            borderRadius: style.size / 2,
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor
          }
        ]}
      >
        <Ionicons name={style.icon} size={Math.round(style.size * 0.46)} color={style.iconColor} />
        {kind === "current" ? <View style={styles.currentPulse} /> : null}
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 4
      },
      android: {
        elevation: 4
      }
    })
  },
  currentPulse: {
    backgroundColor: "rgba(33, 150, 243, 0.25)",
    borderRadius: 999,
    height: 52,
    position: "absolute",
    width: 52,
    zIndex: -1
  }
});
