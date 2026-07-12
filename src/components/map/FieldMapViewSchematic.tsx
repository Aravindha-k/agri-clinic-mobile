import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from "react-native-svg";
import { EXPO_GO_MAP_HINT } from "../../utils/mapLibreNative";
import { useTheme } from "../../theme";
import { hasValidMapCoords, parseMapCoord, filterMapCoordinates } from "../../utils/mapCoords";
import { sanitizeRegion } from "../../utils/mapRegion";
import type { FieldMapViewProps, MapCoordinate, MapPin, MapPinKind } from "./FieldMapView.types";

const MIN_MAP_HEIGHT = 220;
const PAD = 20;
const BG = "#FAFBFA";

function markerColor(kind: MapPinKind | undefined, compact: boolean): string {
  if (compact) {
    switch (kind) {
      case "route_start":
        return "#D97706";
      case "visit":
        return "#16A34A";
      case "route_end":
        return "#C2410C";
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
    case "checkin":
      return "#2563EB";
    default:
      return "#0B5A38";
  }
}

function markerRadius(compact: boolean, kind?: MapPinKind): number {
  if (compact) return kind === "route_start" || kind === "route_end" ? 5 : 4;
  return kind === "route_start" || kind === "route_end" ? 8 : 6;
}

type LatLng = { lat: number; lng: number };

function collectLatLngs(input: {
  markers: MapPin[];
  route: MapCoordinate[];
  fitCoordinates?: MapCoordinate[];
  regionLat: number;
  regionLng: number;
  userLat?: number | null;
  userLng?: number | null;
}): LatLng[] {
  const out: LatLng[] = [];
  if (hasValidMapCoords(input.regionLat, input.regionLng)) {
    out.push({ lat: input.regionLat, lng: input.regionLng });
  }
  if (input.userLat != null && input.userLng != null && hasValidMapCoords(input.userLat, input.userLng)) {
    out.push({ lat: input.userLat, lng: input.userLng });
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

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function routeDistanceMeters(route: MapCoordinate[]): number {
  if (route.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += haversineMeters(
      { lat: route[i - 1].latitude, lng: route[i - 1].longitude },
      { lat: route[i].latitude, lng: route[i].longitude }
    );
  }
  return total;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function arrowPath(x1: number, y1: number, x2: number, y2: number, size = 7): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const a1 = angle + Math.PI * 0.82;
  const a2 = angle - Math.PI * 0.82;
  const xA = mx + size * Math.cos(a1);
  const yA = my + size * Math.sin(a1);
  const xB = mx + size * Math.cos(a2);
  const yB = my + size * Math.sin(a2);
  return `M ${mx} ${my} L ${xA} ${yA} M ${mx} ${my} L ${xB} ${yB}`;
}

/**
 * Interactive route preview for Expo Go — no MapLibre native module.
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
  showLiveUserLocation = false,
  showsUserLocation = false,
  emptyMessage,
  errorMessage,
  routeStrokePrimary,
  compactMarkers = false,
  routeStyle = "default",
  liveFocus
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

  const wantsLive = showLiveUserLocation || showsUserLocation;
  const userLat = parseMapCoord(liveFocus?.latitude ?? (wantsLive ? safeRegion.latitude : null));
  const userLng = parseMapCoord(liveFocus?.longitude ?? (wantsLive ? safeRegion.longitude : null));
  const hasUserFix =
    userLat != null && userLng != null && hasValidMapCoords(userLat, userLng) && (locationGranted || wantsLive);

  const effectiveRoute = useMemo(() => {
    if (safeRoute.length >= 2) return safeRoute;
    if (safeFit && safeFit.length >= 2) return safeFit;
    return safeRoute;
  }, [safeFit, safeRoute]);

  const geometry = useMemo(() => {
    const points = collectLatLngs({
      markers: safeMarkers,
      route: effectiveRoute,
      fitCoordinates: safeFit,
      regionLat: safeRegion.latitude,
      regionLng: safeRegion.longitude,
      userLat: hasUserFix ? userLat : null,
      userLng: hasUserFix ? userLng : null
    });
    if (!points.length) return null;

    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const margin = 0.0015;
    const bounds = {
      minLat: Math.min(...lats) - margin,
      maxLat: Math.max(...lats) + margin,
      minLng: Math.min(...lngs) - margin,
      maxLng: Math.max(...lngs) + margin
    };

    const routePoints =
      effectiveRoute.length >= 2
        ? effectiveRoute.flatMap((p) => {
            const { x, y } = projectPoint(p.latitude, p.longitude, bounds, shellWidth, mapHeight);
            return [x, y];
          })
        : [];

    const arrows: string[] = [];
    for (let i = 0; i + 3 < routePoints.length; i += 2) {
      const x1 = routePoints[i];
      const y1 = routePoints[i + 1];
      const x2 = routePoints[i + 2];
      const y2 = routePoints[i + 3];
      if (i % 8 === 0) arrows.push(arrowPath(x1, y1, x2, y2));
    }

    const markerNodes = safeMarkers.map((m) => {
      const { x, y } = projectPoint(m.lat, m.lng, bounds, shellWidth, mapHeight);
      return {
        key: m.id,
        x,
        y,
        r: markerRadius(compactMarkers, m.kind),
        fill: markerColor(m.kind, compactMarkers),
        kind: m.kind
      };
    });

    const userNode =
      hasUserFix && userLat != null && userLng != null
        ? projectPoint(userLat, userLng, bounds, shellWidth, mapHeight)
        : null;

    const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const cols = 5;
    const rows = 4;
    for (let c = 1; c < cols; c++) {
      const x = PAD + ((shellWidth - PAD * 2) * c) / cols;
      gridLines.push({ x1: x, y1: PAD, x2: x, y2: mapHeight - PAD });
    }
    for (let r = 1; r < rows; r++) {
      const y = PAD + ((mapHeight - PAD * 2) * r) / rows;
      gridLines.push({ x1: PAD, y1: y, x2: shellWidth - PAD, y2: y });
    }

    return {
      routePoints,
      arrows,
      markerNodes,
      userNode,
      gridLines,
      bounds,
      distanceLabel: formatDistance(routeDistanceMeters(effectiveRoute))
    };
  }, [
    compactMarkers,
    effectiveRoute,
    hasUserFix,
    mapHeight,
    safeFit,
    safeMarkers,
    safeRegion.latitude,
    safeRegion.longitude,
    shellWidth,
    userLat,
    userLng
  ]);

  const strokePrimary = routeStrokePrimary ?? theme.colors.primaryDark ?? "#0B5A38";
  const strokeWidth = routeStyle === "compact" ? 2.5 : 3.5;
  const mutedColor = theme.colors.muted ?? "#6B7F74";

  if (loading || !permissionResolved) {
    return (
      <View style={[styles.shell, styles.centered, { height: mapHeight, width: shellWidth }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.message, { color: mutedColor }]}>Loading route preview…</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.shell, { height: mapHeight, width: shellWidth }]}
      accessibilityLabel={`${screenName} route preview`}
    >
      <Svg width={shellWidth} height={mapHeight}>
        <Line x1={PAD} y1={PAD} x2={PAD} y2={mapHeight - PAD} stroke="rgba(11,90,56,0.08)" strokeWidth={1} />
        <Line x1={PAD} y1={PAD} x2={shellWidth - PAD} y2={PAD} stroke="rgba(11,90,56,0.08)" strokeWidth={1} />

        {geometry?.gridLines.map((g, idx) => (
          <Line
            key={`grid-${idx}`}
            x1={g.x1}
            y1={g.y1}
            x2={g.x2}
            y2={g.y2}
            stroke="rgba(11,90,56,0.06)"
            strokeWidth={1}
          />
        ))}

        {geometry && geometry.routePoints.length >= 4 ? (
          <>
            <Polyline
              points={geometry.routePoints.join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.95)"
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
            {geometry.arrows.map((d, idx) => (
              <Path key={`arrow-${idx}`} d={d} stroke={strokePrimary} strokeWidth={2} fill="none" />
            ))}
          </>
        ) : null}

        {geometry?.markerNodes.map((m) => (
          <Circle key={m.key} cx={m.x} cy={m.y} r={m.r} fill={m.fill} stroke="#FFFFFF" strokeWidth={2} />
        ))}

        {geometry?.userNode ? (
          <>
            <Circle cx={geometry.userNode.x} cy={geometry.userNode.y} r={12} fill="rgba(37, 99, 235, 0.15)" />
            <Circle cx={geometry.userNode.x} cy={geometry.userNode.y} r={6} fill="#2563EB" stroke="#FFFFFF" strokeWidth={2} />
          </>
        ) : null}

        {/* North indicator */}
        <Circle cx={shellWidth - PAD - 4} cy={PAD + 4} r={14} fill="rgba(255,255,255,0.92)" stroke="rgba(11,90,56,0.2)" strokeWidth={1} />
        <SvgText
          x={shellWidth - PAD - 4}
          y={PAD + 8}
          fill="#0B5A38"
          fontSize={11}
          fontWeight="700"
          textAnchor="middle"
        >
          N
        </SvgText>
      </Svg>

      {geometry && geometry.distanceLabel !== "0 m" ? (
        <View style={styles.distancePill} pointerEvents="none">
          <Text style={styles.distanceText}>{geometry.distanceLabel}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>{errorMessage}</Text>
        </View>
      ) : locationDenied ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            GPS off — showing saved route and visit markers only.
          </Text>
        </View>
      ) : null}

      <View style={styles.hintBar} pointerEvents="none">
        <Text style={styles.hintText}>{EXPO_GO_MAP_HINT}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "center",
    backgroundColor: BG,
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
    backgroundColor: "rgba(11, 90, 56, 0.82)",
    bottom: 0,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: "absolute",
    right: 0
  },
  hintText: {
    color: "#F8FAF9",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center"
  },
  distancePill: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(11,90,56,0.15)",
    borderRadius: 10,
    borderWidth: 1,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: "absolute",
    top: 10
  },
  distanceText: {
    color: "#0B5A38",
    fontSize: 11,
    fontWeight: "700"
  },
  infoBanner: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderTopColor: "rgba(11,90,56,0.1)",
    borderTopWidth: 1,
    bottom: 28,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
    right: 0
  },
  infoBannerText: {
    color: "#6B7F74",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center"
  }
});
