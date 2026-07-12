import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { useTheme } from "../../theme";
import { hasValidMapCoords, parseMapCoord, filterMapCoordinates } from "../../utils/mapCoords";
import { isExpoGo } from "../../utils/mapLibreNative";
import { sanitizeRegion } from "../../utils/mapRegion";
import type { FieldMapViewProps, MapCoordinate, MapPin, MapPinKind } from "./FieldMapView.types";

const MIN_MAP_HEIGHT = 220;
const PAD = 18;

function markerColor(kind: MapPinKind | undefined, compact: boolean): string {
  if (compact) {
    switch (kind) {
      case "route_start":
        return "#D97706";
      case "visit":
        return "#16A34A";
      default:
        return "#0B5A38";
    }
  }
  switch (kind) {
    case "route_start":
      return "#D97706";
    case "visit":
      return "#16A34A";
    case "route_end":
      return "#C2410C";
    case "farmer":
      return "#15803D";
    default:
      return "#0B5A38";
  }
}

function markerRadius(compact: boolean, kind?: MapPinKind): number {
  if (compact) return kind === "route_start" ? 5 : 4;
  return kind === "route_start" || kind === "route_end" ? 7 : 6;
}

type LatLng = { lat: number; lng: number };

function collectLatLngs(input: {
  markers: MapPin[];
  route: MapCoordinate[];
  fitCoordinates?: MapCoordinate[];
  regionLat: number;
  regionLng: number;
}): LatLng[] {
  const out: LatLng[] = [];
  if (hasValidMapCoords(input.regionLat, input.regionLng)) {
    out.push({ lat: input.regionLat, lng: input.regionLng });
  }
  for (const m of input.markers) {
    if (hasValidMapCoords(m.lat, m.lng)) out.push({ lat: m.lat, lng: m.lng });
  }
  for (const p of input.route) {
    if (hasValidMapCoords(p.latitude, p.longitude)) {
      out.push({ lat: p.latitude, lng: p.longitude });
    }
  }
  for (const p of input.fitCoordinates ?? []) {
    if (hasValidMapCoords(p.latitude, p.longitude)) {
      out.push({ lat: p.latitude, lng: p.longitude });
    }
  }
  return out;
}

function projectPoint(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number
): { x: number; y: number } {
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.0008);
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.0008);
  const x = PAD + ((lng - bounds.minLng) / lngSpan) * (width - PAD * 2);
  const y = PAD + (1 - (lat - bounds.minLat) / latSpan) * (height - PAD * 2);
  return { x, y };
}

/**
 * Lightweight route preview for Expo Go — no MapLibre native module required.
 * Draws GPS route + markers on an SVG canvas using the same FieldMapView props.
 */
export function FieldMapViewSchematic({
  screenName = "FieldMapViewSchematic",
  height,
  width,
  region,
  markers = [],
  route = [],
  fitCoordinates,
  loading = false,
  permissionResolved = true,
  locationDenied = false,
  locationGranted = false,
  showsUserLocation = false,
  emptyMessage,
  errorMessage,
  routeStrokePrimary,
  compactMarkers = false,
  routeStyle = "default"
}: FieldMapViewProps) {
  const { theme } = useTheme();
  const mapHeight = height > 0 ? height : MIN_MAP_HEIGHT;
  const shellWidth = Math.max(width, 1);
  const safeRegion = useMemo(() => sanitizeRegion(region), [region]);

  const safeMarkers = useMemo(
    () =>
      markers
        .map((m) => {
          const lat = parseMapCoord(m.lat);
          const lng = parseMapCoord(m.lng);
          if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
          return { ...m, lat, lng };
        })
        .filter(Boolean) as MapPin[],
    [markers]
  );

  const safeRoute = useMemo(
    () =>
      filterMapCoordinates(
        route
          .map((p) => {
            const lat = parseMapCoord(p.latitude);
            const lng = parseMapCoord(p.longitude);
            if (lat == null || lng == null) return null;
            return { latitude: lat, longitude: lng };
          })
          .filter(Boolean) as MapCoordinate[]
      ),
    [route]
  );

  const safeFit = useMemo(
    () =>
      fitCoordinates
        ?.map((p) => {
          const lat = parseMapCoord(p.latitude);
          const lng = parseMapCoord(p.longitude);
          if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
          return { latitude: lat, longitude: lng };
        })
        .filter(Boolean) as MapCoordinate[],
    [fitCoordinates]
  );

  const hasRenderableCoordinates = useMemo(() => {
    if (safeMarkers.length > 0) return true;
    if (safeRoute.length >= 1) return true;
    if (safeFit && safeFit.length > 0) return true;
    if (showsUserLocation && locationGranted) return true;
    return hasValidMapCoords(safeRegion.latitude, safeRegion.longitude);
  }, [
    locationGranted,
    safeFit,
    safeMarkers.length,
    safeRegion.latitude,
    safeRegion.longitude,
    safeRoute.length,
    showsUserLocation
  ]);

  const geometry = useMemo(() => {
    const points = collectLatLngs({
      markers: safeMarkers,
      route: safeRoute,
      fitCoordinates: safeFit,
      regionLat: safeRegion.latitude,
      regionLng: safeRegion.longitude
    });
    if (!points.length) return null;

    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const margin = 0.0012;
    const bounds = {
      minLat: Math.min(...lats) - margin,
      maxLat: Math.max(...lats) + margin,
      minLng: Math.min(...lngs) - margin,
      maxLng: Math.max(...lngs) + margin
    };

    const routePoints =
      safeRoute.length >= 2
        ? safeRoute.flatMap((p) => {
            const { x, y } = projectPoint(p.latitude, p.longitude, bounds, shellWidth, mapHeight);
            return [x, y];
          })
        : [];

    const markerNodes = safeMarkers.map((m) => {
      const { x, y } = projectPoint(m.lat, m.lng, bounds, shellWidth, mapHeight);
      const r = markerRadius(compactMarkers, m.kind);
      return {
        key: m.id,
        x,
        y,
        r,
        fill: markerColor(m.kind, compactMarkers)
      };
    });

    return { routePoints, markerNodes, bounds };
  }, [compactMarkers, mapHeight, safeFit, safeMarkers, safeRegion.latitude, safeRegion.longitude, safeRoute, shellWidth]);

  const shellBg = theme.colors.cardMuted ?? "#e8f0ea";
  const placeholderColor = theme.colors.muted ?? "#6B7F74";
  const strokePrimary = routeStrokePrimary ?? theme.colors.primaryDark ?? "#0B5A38";
  const strokeWidth = routeStyle === "compact" ? 2.5 : 3.5;
  const showExpoHint = isExpoGo();

  if (errorMessage) {
    return (
      <View style={[styles.shell, { height: mapHeight, width: shellWidth, backgroundColor: shellBg }]}>
        <Text style={[styles.message, { color: placeholderColor }]}>{errorMessage}</Text>
      </View>
    );
  }

  if (loading || !permissionResolved) {
    return (
      <View style={[styles.shell, styles.centered, { height: mapHeight, width: shellWidth, backgroundColor: shellBg }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.message, { color: placeholderColor }]}>Loading map…</Text>
      </View>
    );
  }

  if (locationDenied) {
    return (
      <View style={[styles.shell, styles.centered, { height: mapHeight, width: shellWidth, backgroundColor: shellBg }]}>
        <Text style={[styles.message, { color: placeholderColor }]}>
          Location not available. Please enable GPS and try again.
        </Text>
      </View>
    );
  }

  if (!hasRenderableCoordinates || !geometry) {
    return (
      <View style={[styles.shell, styles.centered, { height: mapHeight, width: shellWidth, backgroundColor: shellBg }]}>
        <Text style={[styles.message, { color: placeholderColor }]}>
          {emptyMessage ?? "No location to show yet."}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.shell, { height: mapHeight, width: shellWidth, backgroundColor: shellBg }]}
      accessibilityLabel={`${screenName} route preview`}
    >
      <Svg width={shellWidth} height={mapHeight}>
        {geometry.routePoints.length >= 4 ? (
          <>
            <Polyline
              points={geometry.routePoints.join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth={strokeWidth + 3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points={geometry.routePoints.join(" ")}
              fill="none"
              stroke={strokePrimary}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : safeRoute.length === 1 || safeMarkers.length === 1 ? (
          (() => {
            const routePoint = safeRoute[0];
            const markerPoint = safeMarkers[0];
            const lat = routePoint?.latitude ?? markerPoint?.lat;
            const lng = routePoint?.longitude ?? markerPoint?.lng;
            if (lat == null || lng == null) return null;
            const { x, y } = projectPoint(lat, lng, geometry.bounds, shellWidth, mapHeight);
            return <Circle cx={x} cy={y} r={6} fill={strokePrimary} stroke="#fff" strokeWidth={2} />;
          })()
        ) : null}
        {geometry.markerNodes.map((m) => (
          <Circle key={m.key} cx={m.x} cy={m.y} r={m.r} fill={m.fill} stroke="#FFFFFF" strokeWidth={1.5} />
        ))}
        {/* subtle grid lines for field context */}
        <Line x1={PAD} y1={mapHeight / 2} x2={shellWidth - PAD} y2={mapHeight / 2} stroke="rgba(11,90,56,0.06)" strokeWidth={1} />
        <Line x1={shellWidth / 2} y1={PAD} x2={shellWidth / 2} y2={mapHeight - PAD} stroke="rgba(11,90,56,0.06)" strokeWidth={1} />
      </Svg>
      {showExpoHint ? (
        <View style={styles.hintBar} pointerEvents="none">
          <Text style={styles.hintText}>Route preview · live tiles in dev build</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "center",
    borderRadius: 18,
    overflow: "hidden"
  },
  centered: {
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    padding: 20
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  },
  hintBar: {
    backgroundColor: "rgba(11, 90, 56, 0.72)",
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
    right: 0
  },
  hintText: {
    color: "#F8FAF9",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center"
  }
});
