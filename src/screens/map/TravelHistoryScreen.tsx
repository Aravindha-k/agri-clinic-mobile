import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { getAllWorkdayLocations, getTodayWorkday, LocationLogPoint } from "../../api/tracking";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { FieldMapView } from "../../components/map/FieldMapView";
import { MapErrorBoundary } from "../../components/map/MapErrorBoundary";
import { AppHeader, PrimaryButton } from "../../components/ui";
import { useMapAreaHeight } from "../../hooks/useMapAreaHeight";
import { useSecureScreen } from "../../hooks/useSecureScreen";
import { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme";
import { fontWeights } from "../../theme/fontWeights";
import { formatShortDateTime } from "../../utils/format";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../../utils/mapRegion";

type Props = NativeStackScreenProps<RootStackParamList, "TravelHistory">;

export function TravelHistoryScreen({ navigation }: Props) {
  useSecureScreen();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const mapHeight = useMapAreaHeight(112);
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [points, setPoints] = useState<LocationLogPoint[]>([]);
  const [workdayLabel, setWorkdayLabel] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const workday = await getTodayWorkday();
      if (!mountedRef.current) return;

      if (!workday?.workday_id) {
        setPoints([]);
        setWorkdayLabel("No workday today");
        return;
      }
      setWorkdayLabel(workday.is_active ? "Active workday" : "Today's workday");
      const logs = await getAllWorkdayLocations(workday.workday_id);
      if (!mountedRef.current) return;
      setPoints(logs.filter((p) => hasValidMapCoords(p.latitude, p.longitude)));
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Unable to load travel history.");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const route = useMemo(
    () =>
      points
        .map((p) => {
          const lat = parseMapCoord(p.latitude);
          const lng = parseMapCoord(p.longitude);
          if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) return null;
          return { latitude: lat, longitude: lng };
        })
        .filter(Boolean) as { latitude: number; longitude: number }[],
    [points]
  );

  const region = useMemo(
    () => (route.length ? fitMapRegion(route.map((p) => ({ lat: p.latitude, lng: p.longitude }))) : DEFAULT_MAP_REGION),
    [route]
  );

  const markers = useMemo(() => {
    if (route.length < 1) return [];
    const start = route[0];
    const latest = route[route.length - 1];
    const items = [
      {
        id: "start",
        lat: start.latitude,
        lng: start.longitude,
        title: "Start"
      }
    ];
    if (route.length > 1) {
      items.push({
        id: "latest",
        lat: latest.latitude,
        lng: latest.longitude,
        title: "Latest"
      });
    }
    return items;
  }, [route]);

  const listData = useMemo(() => [...points].reverse().slice(0, 50), [points]);
  const canShowMap = !loading && route.length > 0;

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader
        title="Today's travel"
        subtitle={points.length ? `${points.length} GPS points · ${workdayLabel}` : workdayLabel}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        {canShowMap ? (
          <MapErrorBoundary height={mapHeight} screenName="TravelHistoryScreen">
            <FieldMapView
              screenName="TravelHistoryScreen"
              height={mapHeight}
              width={Math.max(width - 32, 280)}
              region={region}
              route={route}
              permissionResolved
              locationGranted={false}
              showsUserLocation={false}
              loading={loading}
              markers={markers}
            />
          </MapErrorBoundary>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: c.cardMuted, borderColor: c.border }]}>
            <Ionicons name="map-outline" size={28} color={c.muted} />
            <Text style={[styles.placeholderText, { color: c.muted }]}>
              {loading
                ? "Loading route…"
                : "Map could not load. Start work today and allow GPS to record your travel route."}
            </Text>
          </View>
        )}

        {!loading && points.length === 0 ? (
          <EmptyState
            title="No route history yet"
            message="Start your workday from Tracking. Your path appears here as GPS check-ins are saved."
            illustration="map"
            actionLabel="Open tracking"
            onAction={() => {
              navigation.navigate("Main", { screen: "Profile", params: { screen: "TrackingWorkspace" } });
            }}
          />
        ) : (
          <>
            <Text style={[styles.section, { color: c.muted }]}>Route timeline</Text>
            <FlatList
              data={listData}
              keyExtractor={(item, i) => String(item.id ?? `${item.recorded_at}-${i}`)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item, index }) => (
                <View style={[styles.row, { borderColor: c.border }]}>
                  <Text style={[styles.rowTime, { color: c.text }]}>
                    {item.recorded_at ? formatShortDateTime(item.recorded_at) : "—"}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>
                    Point {listData.length - index} · {parseMapCoord(item.latitude)?.toFixed(5)},{" "}
                    {parseMapCoord(item.longitude)?.toFixed(5)}
                  </Text>
                </View>
              )}
            />
          </>
        )}

        <PrimaryButton title="Refresh route" onPress={() => { setLoading(true); void load(); }} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  mapPlaceholder: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 220,
    padding: 20
  },
  placeholderText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  section: { fontSize: 12, fontWeight: fontWeights.bold, letterSpacing: 0.5, textTransform: "uppercase" },
  list: { flex: 1, maxHeight: 220 },
  listContent: { gap: 8, paddingBottom: 8 },
  row: { borderRadius: 12, borderWidth: 1, padding: 12 },
  rowTime: { fontSize: 14, fontWeight: fontWeights.bold, marginBottom: 4 }
});
