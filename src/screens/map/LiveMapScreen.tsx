import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { ErrorState } from "../../components/ErrorState";
import { FieldMapView } from "../../components/map/FieldMapView";
import { MapErrorBoundary } from "../../components/map/MapErrorBoundary";
import { AppHeader } from "../../components/ui";
import { useMapAreaHeight } from "../../hooks/useMapAreaHeight";
import { RootStackParamList } from "../../navigation/types";
import { useTracking } from "../../storage/TrackingContext";
import { useTheme } from "../../theme";
import { fontWeights } from "../../theme/fontWeights";
import { formatShortDateTime } from "../../utils/format";
import { getForegroundLocation } from "../../utils/location";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { logMapDiagnostics } from "../../utils/mapDebug";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../../utils/mapRegion";

type Props = NativeStackScreenProps<RootStackParamList, "LiveMap">;

export function LiveMapScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const mapHeight = useMapAreaHeight(112);
  const mountedRef = useRef(true);

  const { isActive, lastSyncTime, currentLocation, refreshTracking, retryForegroundSync, fieldLocationBlocked, error } =
    useTracking();

  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [permissionResolved, setPermissionResolved] = useState(false);
  const [label, setLabel] = useState("Locating…");

  const loadLive = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent && mountedRef.current) {
      setPermissionResolved(false);
    }

    try {
      const result = await getForegroundLocation();
      if (!mountedRef.current) return;

      if (!result.granted) {
        setHasLocationPermission(false);
        setLive(null);
        setLabel(result.message || "Allow location permission");
        return;
      }

      const lat = result.location.coords.latitude;
      const lng = result.location.coords.longitude;

      if (!hasValidMapCoords(lat, lng)) {
        setHasLocationPermission(false);
        setLive(null);
        setLabel("Location unavailable");
        return;
      }

      setHasLocationPermission(true);
      setLive({ lat, lng });
      setLabel("Live · updated just now");
    } catch {
      if (!mountedRef.current) return;
      setHasLocationPermission(false);
      setLive(null);
      setLabel("Location unavailable");
    } finally {
      if (mountedRef.current) {
        setPermissionResolved(true);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadLive();
    const id = setInterval(() => void loadLive({ silent: true }), 30000);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [loadLive]);

  const serverPin = useMemo(() => {
    if (!hasValidMapCoords(currentLocation?.latitude, currentLocation?.longitude)) return null;
    const lat = parseMapCoord(currentLocation?.latitude);
    const lng = parseMapCoord(currentLocation?.longitude);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [currentLocation]);

  const region = useMemo(() => {
    const points = [live, serverPin].filter(Boolean) as { lat: number; lng: number }[];
    if (!points.length) {
      return DEFAULT_MAP_REGION;
    }
    return fitMapRegion(points);
  }, [live, serverPin]);

  const mapMarkers = useMemo(
    () =>
      serverPin
        ? [
            {
              id: "last-checkin",
              lat: serverPin.lat,
              lng: serverPin.lng,
              title: "Last check-in",
              description: lastSyncTime ? formatShortDateTime(lastSyncTime) : undefined
            }
          ]
        : [],
    [lastSyncTime, serverPin]
  );

  const showMap = permissionResolved && (hasLocationPermission || serverPin != null);

  useEffect(() => {
    logMapDiagnostics("LiveMapScreen", {
      permissionResolved,
      locationDenied: permissionResolved && !hasLocationPermission && !serverPin,
      locationGranted: hasLocationPermission,
      rawLatitude: currentLocation?.latitude,
      rawLongitude: currentLocation?.longitude,
      sanitizedLatitude: live?.lat ?? serverPin?.lat ?? null,
      sanitizedLongitude: live?.lng ?? serverPin?.lng ?? null,
      region,
      canRenderMap: showMap,
      markerCount: mapMarkers.length,
      showsUserLocation: hasLocationPermission,
      note: label
    });
  }, [
    currentLocation?.latitude,
    currentLocation?.longitude,
    hasLocationPermission,
    label,
    live,
    mapMarkers.length,
    permissionResolved,
    region,
    serverPin,
    showMap
  ]);

  if (fieldLocationBlocked) {
    return (
      <ErrorState
        message="Location is required during your workday. Enable GPS to use the live map."
        onRetry={() => void retryForegroundSync().catch(() => undefined)}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader title="Live map" subtitle="Your current field position" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: c.primaryDark }]}>
          <View style={styles.liveDot} />
          <View style={styles.badgeCopy}>
            <Text style={styles.badgeTitle}>Location active</Text>
            <Text style={styles.badgeSub}>{label}</Text>
          </View>
          <Pressable onPress={() => void refreshTracking().catch(() => undefined)} hitSlop={8}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.warn, { backgroundColor: c.warningSoft, borderColor: c.warning }]}>
            <Text style={[styles.warnText, { color: c.warning }]}>{error}</Text>
          </View>
        ) : null}

        {!showMap ? (
          <View style={[styles.fallbackCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="location-outline" size={28} color={c.muted} />
            <Text style={[styles.fallbackTitle, { color: c.text }]}>Map could not load</Text>
            <Text style={[styles.fallbackBody, { color: c.muted }]}>
              Please enable GPS and allow location access, then tap refresh.
            </Text>
            <Pressable onPress={() => void loadLive()} style={[styles.retryBtn, { backgroundColor: c.primarySoft }]}>
              <Text style={[styles.retryText, { color: c.primaryDark }]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <MapErrorBoundary height={mapHeight} screenName="LiveMapScreen">
            <FieldMapView
              screenName="LiveMapScreen"
              height={mapHeight}
              width={Math.max(width - 32, 280)}
              region={region}
              permissionResolved={permissionResolved}
              locationDenied={permissionResolved && !hasLocationPermission && !serverPin}
              locationGranted={hasLocationPermission}
              loading={!permissionResolved}
              showsUserLocation={hasLocationPermission}
              followsUserLocation={false}
              markers={mapMarkers}
            />
          </MapErrorBoundary>
        )}

        <Text style={[styles.hint, { color: c.muted }]}>
          {isActive
            ? "Blue dot is you now. The pin is your last saved check-in while working."
            : "Start work today on Home to save your route while you visit farmers."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { alignItems: "center", flex: 1, gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  badge: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  badgeCopy: { flex: 1 },
  liveDot: { backgroundColor: "#4ADE80", borderRadius: 99, height: 10, width: 10 },
  badgeTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: fontWeights.heavy },
  badgeSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  warn: { alignSelf: "stretch", borderRadius: 12, borderWidth: 1, padding: 12 },
  warnText: { fontSize: 13, fontWeight: "700", lineHeight: 18, textAlign: "center" },
  fallbackCard: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minHeight: 220,
    justifyContent: "center",
    padding: 20
  },
  fallbackTitle: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  fallbackBody: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryBtn: { borderRadius: 10, marginTop: 8, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { fontSize: 14, fontWeight: "800" },
  hint: { fontSize: 13, lineHeight: 19, textAlign: "center" }
});
