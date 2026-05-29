import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { getAllWorkdayLocations, getTodayWorkday, LocationLogPoint } from "../../api/tracking";
import { ErrorState } from "../../components/ErrorState";
import { EmptyState } from "../../components/EmptyState";
import { FieldMapView } from "../../components/map/FieldMapView";
import { AppHeader, PrimaryButton } from "../../components/ui";
import { useMapAreaHeight } from "../../hooks/useMapAreaHeight";
import { RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme";
import { fontWeights } from "../../theme/fontWeights";
import { formatShortDateTime } from "../../utils/format";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { fitMapRegion } from "../../utils/mapRegion";

type Props = NativeStackScreenProps<RootStackParamList, "TravelHistory">;

export function TravelHistoryScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const mapHeight = useMapAreaHeight(112);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [points, setPoints] = useState<LocationLogPoint[]>([]);
  const [workdayLabel, setWorkdayLabel] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const workday = await getTodayWorkday();
      if (!workday?.workday_id) {
        setPoints([]);
        setWorkdayLabel("No workday today");
        return;
      }
      setWorkdayLabel(workday.is_active ? "Active workday" : "Today's workday");
      const logs = await getAllWorkdayLocations(workday.workday_id);
      setPoints(logs.filter((p) => hasValidMapCoords(p.latitude, p.longitude)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load travel history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const route = useMemo(
    () =>
      points
        .map((p) => {
          const lat = parseMapCoord(p.latitude);
          const lng = parseMapCoord(p.longitude);
          if (lat == null || lng == null) return null;
          return { latitude: lat, longitude: lng };
        })
        .filter(Boolean) as { latitude: number; longitude: number }[],
    [points]
  );

  const region = useMemo(() => fitMapRegion(route.map((p) => ({ lat: p.latitude, lng: p.longitude }))), [route]);

  const listData = useMemo(() => [...points].reverse().slice(0, 50), [points]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader
        title="Today's travel"
        subtitle={points.length ? `${points.length} GPS points · ${workdayLabel}` : workdayLabel}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        <FieldMapView
          height={mapHeight}
          width={width - 32}
          region={region}
          route={route}
          showsUserLocation
          loading={loading}
          markers={
            route.length
              ? [
                  {
                    id: "start",
                    lat: route[0].latitude,
                    lng: route[0].longitude,
                    title: "Start",
                    pinColor: c.primaryDark
                  },
                  {
                    id: "latest",
                    lat: route[route.length - 1].latitude,
                    lng: route[route.length - 1].longitude,
                    title: "Latest",
                    pinColor: "#2196F3"
                  }
                ]
              : []
          }
        />

        {!loading && points.length === 0 ? (
          <EmptyState
            title="No travel route yet"
            message="Start work on Home. Your path appears here as GPS check-ins are saved during the day."
            illustration="map"
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
  section: { fontSize: 12, fontWeight: fontWeights.bold, letterSpacing: 0.5, textTransform: "uppercase" },
  list: { flex: 1, maxHeight: 220 },
  listContent: { gap: 8, paddingBottom: 8 },
  row: { borderRadius: 12, borderWidth: 1, padding: 12 },
  rowTime: { fontSize: 14, fontWeight: fontWeights.bold, marginBottom: 4 }
});
