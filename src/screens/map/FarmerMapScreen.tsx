import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import * as Location from "expo-location";
import { Farmer, getFarmer, getFarmerVisits } from "../../api/farmers";
import { ErrorState } from "../../components/ErrorState";
import { FieldMapView, type MapCoordinate } from "../../components/map/FieldMapView";
import { MapErrorBoundary } from "../../components/map/MapErrorBoundary";
import { AppHeader, PrimaryButton } from "../../components/ui";
import { useMapAreaHeight } from "../../hooks/useMapAreaHeight";
import { useSecureScreen } from "../../hooks/useSecureScreen";
import { useMapTabBarBottomPadding } from "../../hooks/useTabBarBottomInset";
import { FarmersStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme";
import { MAP_SCREEN_BOTTOM_PADDING } from "../../theme/tabBar";
import { fontWeights } from "../../theme/fontWeights";
import { asArray } from "../../utils/format";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { openMapDirections } from "../../utils/mapDirections";
import { formatDistanceAway, haversineKm } from "../../utils/mapDistance";
import { fitMapRegion } from "../../utils/mapRegion";

type Props = NativeStackScreenProps<FarmersStackParamList, "FarmerMap">;

const FIT_PADDING = { top: 80, right: 60, bottom: MAP_SCREEN_BOTTOM_PADDING, left: 60 };

export function FarmerMapScreen({ navigation, route }: Props) {
  useSecureScreen();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const mapBottomPad = useMapTabBarBottomPadding();
  const mapHeight = useMapAreaHeight(100);
  const mountedRef = useRef(true);
  const { farmerId, farmerName, village } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [you, setYou] = useState<{ lat: number; lng: number } | null>(null);
  const [locLabel, setLocLabel] = useState("Getting your location…");
  const [permissionResolved, setPermissionResolved] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const [farmerData, visits] = await Promise.all([getFarmer(farmerId), getFarmerVisits(farmerId)]);
      if (!mountedRef.current) return;
      setFarmer(farmerData);

      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === "granted") {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          if (hasValidMapCoords(lat, lng)) {
            setYou({ lat, lng });
            setLocationGranted(true);
            setLocLabel("Your location ready");
          } else {
            setYou(null);
            setLocationGranted(false);
            setLocLabel("Location not available. Please enable GPS and try again.");
          }
        } catch {
          setYou(null);
          setLocationGranted(false);
          setLocLabel("Location not available. Please enable GPS and try again.");
        }
      } else {
        setYou(null);
        setLocationGranted(false);
        setLocLabel("Allow location to see route to farmer");
      }

      const visitList = asArray<Record<string, unknown>>(visits);
      if (!hasValidMapCoords(farmerData.latitude, farmerData.longitude)) {
        const withGps = visitList.find((v) => hasValidMapCoords(v.latitude as string, v.longitude as string));
        if (withGps && farmerData) {
          setFarmer({
            ...farmerData,
            latitude: withGps.latitude as string | number,
            longitude: withGps.longitude as string | number
          });
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Unable to load farmer map.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setPermissionResolved(true);
      }
    }
  }, [farmerId]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const paramPin = useMemo(() => {
    const lat = parseMapCoord(route.params.latitude);
    const lng = parseMapCoord(route.params.longitude);
    if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
    return { lat, lng };
  }, [route.params.latitude, route.params.longitude]);

  const farmerPin = useMemo(() => {
    if (farmer) {
      const lat = parseMapCoord(farmer.latitude);
      const lng = parseMapCoord(farmer.longitude);
      if (lat != null && lng != null && hasValidMapCoords(lat, lng)) return { lat, lng };
    }
    if (paramPin && hasValidMapCoords(paramPin.lat, paramPin.lng)) return paramPin;
    return null;
  }, [farmer, paramPin]);

  const userCoord = useMemo<MapCoordinate | null>(
    () => (you && hasValidMapCoords(you.lat, you.lng) ? { latitude: you.lat, longitude: you.lng } : null),
    [you]
  );

  const farmerCoord = useMemo<MapCoordinate | null>(
    () => (farmerPin ? { latitude: farmerPin.lat, longitude: farmerPin.lng } : null),
    [farmerPin]
  );

  const routeLine = useMemo<MapCoordinate[]>(() => {
    if (!userCoord || !farmerCoord) return [];
    return [userCoord, farmerCoord];
  }, [userCoord, farmerCoord]);

  const fitCoordinates = useMemo<MapCoordinate[] | undefined>(() => {
    if (userCoord && farmerCoord) return [userCoord, farmerCoord];
    if (farmerCoord) return [farmerCoord];
    if (userCoord) return [userCoord];
    return undefined;
  }, [userCoord, farmerCoord]);

  const region = useMemo(() => {
    const points = [you, farmerPin].filter(Boolean) as { lat: number; lng: number }[];
    return fitMapRegion(
      points,
      you ? { latitude: you.lat, longitude: you.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 } : undefined
    );
  }, [you, farmerPin]);

  const distanceLabel = useMemo(() => {
    if (!you || !farmerPin) return null;
    const km = haversineKm(you.lat, you.lng, farmerPin.lat, farmerPin.lng);
    return formatDistanceAway(km);
  }, [you, farmerPin]);

  const displayName = farmer?.name || farmerName || "Farmer";
  const place = String(village || farmer?.village_name || farmer?.village || "");
  const canShowMap = !loading && permissionResolved && (farmerPin != null || you != null);

  async function handleDirections() {
    if (!farmerPin) return;
    await openMapDirections({
      latitude: farmerPin.lat,
      longitude: farmerPin.lng,
      label: displayName
    });
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader title={displayName} subtitle={place || "Farmer location"} onBack={() => navigation.goBack()} />
      <View style={[styles.body, { paddingBottom: mapBottomPad }]}>
        <View style={[styles.legend, { backgroundColor: c.primarySoft }]}>
          <LegendDot color="#2196F3" label="You" />
          <LegendDot color={c.primaryDark} label="Farmer" />
          {routeLine.length >= 2 ? <LegendDot color={c.primary} label="Route" line /> : null}
          <Text style={[styles.locHint, { color: c.muted }]}>{locLabel}</Text>
        </View>

        <View style={styles.mapShell}>
          {canShowMap ? (
            <MapErrorBoundary height={mapHeight} screenName="FarmerMapScreen">
              <FieldMapView
                screenName="FarmerMapScreen"
                height={mapHeight}
                width={Math.max(width - 32, 280)}
                region={region}
                route={routeLine}
                fitCoordinates={fitCoordinates}
                fitEdgePadding={FIT_PADDING}
                permissionResolved={permissionResolved}
                locationGranted={locationGranted}
                locationDenied={permissionResolved && !locationGranted && !farmerPin}
                loading={loading}
                showsUserLocation={false}
                markers={[
                  ...(you
                    ? [
                        {
                          id: "you",
                          lat: you.lat,
                          lng: you.lng,
                          title: "You",
                          description: "Your location"
                        }
                      ]
                    : []),
                  ...(farmerPin
                    ? [
                        {
                          id: "farmer",
                          lat: farmerPin.lat,
                          lng: farmerPin.lng,
                          title: displayName,
                          description: place
                        }
                      ]
                    : [])
                ]}
              />
            </MapErrorBoundary>
          ) : (
            <View style={[styles.mapPlaceholder, { backgroundColor: c.cardMuted, borderColor: c.border }]}>
              <Ionicons name="map-outline" size={28} color={c.muted} />
              <Text style={[styles.placeholderText, { color: c.muted }]}>
                Map could not load. Please enable GPS and try again.
              </Text>
            </View>
          )}

          {farmerPin ? (
            <View
              style={[
                styles.overlay,
                { backgroundColor: c.card },
                Platform.OS === "android" ? styles.overlayShadowAndroid : styles.overlayShadowIos
              ]}
            >
              {distanceLabel ? (
                <View style={styles.distanceRow}>
                  <Ionicons name="navigate-outline" size={18} color={c.primaryDark} />
                  <Text style={[styles.distanceText, { color: c.text }]}>Farmer is {distanceLabel}</Text>
                </View>
              ) : null}
              <PrimaryButton title="Get directions" onPress={() => void handleDirections()} />
            </View>
          ) : null}
        </View>

        {!loading && !farmerPin ? (
          <View style={[styles.warn, { backgroundColor: c.warningSoft }]}>
            <Ionicons name="location-outline" size={20} color={c.warning} />
            <Text style={[styles.warnText, { color: c.text }]}>
              No GPS for this farmer yet. Plot location appears after a visit is submitted with GPS or when recorded in
              the clinic system.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function LegendDot({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <View style={styles.legendItem}>
      {line ? (
        <View style={[styles.lineSwatch, { backgroundColor: color }]} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, gap: 12, paddingHorizontal: 16, paddingTop: 12 },
  legend: {
    alignSelf: "stretch",
    borderRadius: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 12
  },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  dot: { borderRadius: 99, height: 10, width: 10 },
  lineSwatch: { borderRadius: 2, height: 4, width: 18 },
  legendLabel: { fontSize: 12, fontWeight: fontWeights.bold },
  locHint: { flex: 1, fontSize: 12, minWidth: 120, textAlign: "right" },
  mapShell: {
    alignSelf: "center",
    minHeight: 220,
    position: "relative",
    width: "100%"
  },
  mapPlaceholder: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 220,
    padding: 20
  },
  placeholderText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  overlay: {
    borderRadius: 16,
    bottom: 12,
    gap: 10,
    left: 12,
    padding: 14,
    position: "absolute",
    right: 12
  },
  overlayShadowIos: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12
  },
  overlayShadowAndroid: {
    elevation: 8
  },
  distanceRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  distanceText: { flex: 1, fontSize: 14, fontWeight: "800" },
  warn: { alignItems: "flex-start", borderRadius: 12, flexDirection: "row", gap: 10, padding: 12 },
  warnText: { flex: 1, fontSize: 13, lineHeight: 19 }
});
