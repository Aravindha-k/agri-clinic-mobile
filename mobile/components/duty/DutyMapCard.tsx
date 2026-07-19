import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { FieldMapView } from "../../../src/components/map/FieldMapView";
import type { MapCoordinate, MapPin } from "../../../src/components/map/FieldMapView.types";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import {
  DEFAULT_MAP_REGION,
  fitFieldMapRegion,
  sampleRouteForFit
} from "../../../src/utils/mapRegion";
import { MAP_FILL_MIN_HEIGHT } from "../../../src/utils/responsiveLayout";
import { readPendingVisits, type PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { subscribeVisitDataRefresh } from "../../lib/visit/visitDataRefresh";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const MAP_HEIGHT = 240;

type Props = {
  /** Use remaining parent height (Day full-page map). */
  fill?: boolean;
  hideTitle?: boolean;
  onMarkerPress?: (visitId: number | string) => void;
  onPendingMarkerPress?: (localSyncId: string) => void;
};

function pendingCoord(visit: PendingVisitRecord): { lat: number; lng: number } | null {
  const lat = Number(visit.values.latitude);
  const lng = Number(visit.values.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;
  return { lat, lng };
}

/**
 * Frame around start, visits, and end — simple employee day overview.
 */
function buildDayFitCoordinates(
  dutyMap: ReturnType<typeof useDuty>["dutyMap"],
  pendingVisits: PendingVisitRecord[]
): MapCoordinate[] {
  const points: MapCoordinate[] = [];

  if (dutyMap?.startMarker) {
    points.push({
      latitude: dutyMap.startMarker.latitude,
      longitude: dutyMap.startMarker.longitude
    });
  }

  for (const marker of dutyMap?.visitMarkers ?? []) {
    points.push({ latitude: marker.lat, longitude: marker.lng });
  }

  for (const visit of pendingVisits) {
    const coord = pendingCoord(visit);
    if (coord) points.push({ latitude: coord.lat, longitude: coord.lng });
  }

  if (dutyMap?.endMarker) {
    points.push({
      latitude: dutyMap.endMarker.latitude,
      longitude: dutyMap.endMarker.longitude
    });
  }

  if (points.length >= 1) return points;

  if (dutyMap?.routePoints?.length) {
    return sampleRouteForFit(dutyMap.routePoints).map((p) => ({
      latitude: p.lat,
      longitude: p.lng
    }));
  }

  return [];
}

export function DutyMapCard({
  fill = false,
  hideTitle = false,
  onMarkerPress,
  onPendingMarkerPress
}: Props) {
  const { t } = useI18n();
  const { dutyMap } = useDuty();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const estimatedFillHeight = Math.max(MAP_FILL_MIN_HEIGHT, Math.round(windowHeight * 0.42));
  const [previewWidth, setPreviewWidth] = useState(() => Math.max(1, Math.round(windowWidth - Spacing.lg * 2)));
  const [previewHeight, setPreviewHeight] = useState(() => (fill ? estimatedFillHeight : MAP_HEIGHT));
  const [pendingVisits, setPendingVisits] = useState<PendingVisitRecord[]>([]);

  useEffect(() => {
    if (!fill) return;
    setPreviewHeight((prev) => (prev < MAP_FILL_MIN_HEIGHT ? estimatedFillHeight : prev));
  }, [estimatedFillHeight, fill]);

  useEffect(() => {
    let active = true;
    const load = () => {
      void readPendingVisits().then((rows) => {
        if (active) setPendingVisits(rows);
      });
    };
    load();
    return subscribeVisitDataRefresh(load);
  }, []);

  const fitCoordinates = useMemo(
    () => buildDayFitCoordinates(dutyMap, pendingVisits),
    [dutyMap, pendingVisits]
  );

  const markers = useMemo((): MapPin[] => {
    const rows: MapPin[] = [];
    const serverKeys = new Set<string>();
    for (const marker of dutyMap?.visitMarkers ?? []) {
      serverKeys.add(String(marker.id));
      if (marker.visitId != null) serverKeys.add(String(marker.visitId));
    }

    // 1) Work start
    if (dutyMap?.startMarker) {
      rows.push({
        id: "route-start",
        lat: dutyMap.startMarker.latitude,
        lng: dutyMap.startMarker.longitude,
        title: t("myLocation.legendRouteStart"),
        description: t("myLocation.workStartHint"),
        kind: "route_start"
      });
    }

    // 2) Completed (and pending) visits — numbered in order
    for (const marker of dutyMap?.visitMarkers ?? []) {
      rows.push({
        ...marker,
        id: marker.visitId != null ? `visit-${marker.visitId}` : marker.id,
        kind: "visit",
        label: marker.sequence,
        pending: Boolean(marker.pending),
        title: marker.title || t("myLocation.legendVisit"),
        description: marker.pending
          ? t("visitFlow.pendingStatus_pending")
          : t("myLocation.legendVisit")
      });
    }

    let pendingIndex = (dutyMap?.visitMarkers?.length ?? 0) + 1;
    for (const visit of pendingVisits) {
      if (
        serverKeys.has(visit.local_sync_id) ||
        serverKeys.has(`visit-${visit.local_sync_id}`) ||
        serverKeys.has(`pending-${visit.local_sync_id}`)
      ) {
        continue;
      }
      const coord = pendingCoord(visit);
      if (!coord) continue;
      rows.push({
        id: `pending-${visit.local_sync_id}`,
        lat: coord.lat,
        lng: coord.lng,
        title: visit.values.farmer_name || t("visitFlow.farmer"),
        description: t("visitFlow.pendingStatus_pending"),
        kind: "visit",
        label: pendingIndex++,
        pending: true,
        visitId: visit.local_sync_id
      });
    }

    // 3) Work end (when workday finished)
    if (dutyMap?.endMarker) {
      rows.push({
        id: "route-end",
        lat: dutyMap.endMarker.latitude,
        lng: dutyMap.endMarker.longitude,
        title: t("myLocation.legendRouteEnd"),
        description: t("myLocation.workEndHint"),
        kind: "route_end"
      });
    }
    return rows;
  }, [dutyMap, pendingVisits, t]);

  const mapRegion = useMemo(() => {
    if (fitCoordinates.length === 0) return DEFAULT_MAP_REGION;
    return fitFieldMapRegion(
      fitCoordinates.map((p) => ({ lat: p.latitude, lng: p.longitude })),
      DEFAULT_MAP_REGION,
      { padding: 1.5, minDelta: 0.012, maxDelta: 0.08 }
    );
  }, [fitCoordinates]);

  const mapHeight = fill ? Math.max(MAP_FILL_MIN_HEIGHT, previewHeight) : MAP_HEIGHT;
  const showMap = previewWidth > 0 && mapHeight > 0;
  const hasStart = Boolean(dutyMap?.startMarker);
  const hasEnd = Boolean(dutyMap?.endMarker);
  const visitCount = dutyMap?.visitMarkers?.length ?? 0;
  const pendingCount = pendingVisits.filter((v) => pendingCoord(v)).length;
  const isEmpty = markers.length === 0;
  const mapSummary = t("a11y.mapSummary", { visits: visitCount, pending: pendingCount });

  const emptyMessage = !hasStart
    ? t("myLocation.noVisitsMapHint")
    : t("myLocation.noVisitsYetOnMap");

  return (
    <View
      style={fill ? styles.fillSection : styles.section}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${t("daySummary.routeSummary")}. ${mapSummary}`}
    >
      {hideTitle ? null : (
        <Text style={styles.title} accessibilityRole="header">
          {t("daySummary.routeSummary")}
        </Text>
      )}
      <View
        style={fill ? styles.fillMapWrap : styles.mapWrap}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          const h = Math.round(e.nativeEvent.layout.height);
          if (w > 0) setPreviewWidth(w);
          if (fill && h >= MAP_FILL_MIN_HEIGHT) setPreviewHeight(h);
          else if (fill && h > 0) setPreviewHeight(Math.max(MAP_FILL_MIN_HEIGHT, h));
        }}
      >
        {!showMap ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.brand700} />
          </View>
        ) : (
          <View style={styles.mapStack}>
            <FieldMapView
              screenName="DutyMapCard"
              height={mapHeight}
              width={previewWidth}
              region={mapRegion}
              markers={markers}
              fitCoordinates={fitCoordinates.length ? fitCoordinates : undefined}
              fitEdgePadding={
                fill
                  ? { top: 48, right: 40, bottom: 88, left: 40 }
                  : { top: 36, right: 32, bottom: 56, left: 32 }
              }
              showsUserLocation={false}
              locationGranted={false}
              followsUserLocation={false}
              permissionResolved
              loading={false}
              interactive
              emptyMessage={isEmpty ? emptyMessage : undefined}
              onMarkerPress={
                onMarkerPress || onPendingMarkerPress
                  ? (marker) => {
                      if (marker.pending && marker.visitId != null) {
                        onPendingMarkerPress?.(String(marker.visitId));
                        return;
                      }
                      if (marker.visitId != null) onMarkerPress?.(marker.visitId);
                    }
                  : undefined
              }
            />
            {!isEmpty ? (
              <View style={styles.legend} pointerEvents="none">
                <View style={styles.legendItem}>
                  <View style={[styles.legendBadge, { backgroundColor: "#16A34A" }]}>
                    <Text style={styles.legendBadgeText}>S</Text>
                  </View>
                  <Text style={styles.legendText}>{t("myLocation.legendRouteStart")}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBadge, { backgroundColor: "#0B6B3A" }]}>
                    <Text style={styles.legendBadgeText}>1</Text>
                  </View>
                  <Text style={styles.legendText}>{t("myLocation.legendVisit")}</Text>
                </View>
                {hasEnd ? (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBadge, { backgroundColor: "#DC2626" }]}>
                      <Text style={styles.legendBadgeText}>E</Text>
                    </View>
                    <Text style={styles.legendText}>{t("myLocation.legendRouteEnd")}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg
  },
  fillSection: {
    flex: 1,
    minHeight: MAP_FILL_MIN_HEIGHT,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: "700"
  },
  mapWrap: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    height: MAP_HEIGHT,
    overflow: "hidden",
    width: "100%"
  },
  fillMapWrap: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: MAP_FILL_MIN_HEIGHT,
    overflow: "hidden",
    width: "100%"
  },
  mapStack: {
    flex: 1,
    position: "relative"
  },
  legend: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    right: 12
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  legendBadge: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: "center",
    width: 18
  },
  legendBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800"
  },
  legendText: {
    color: Colors.text2,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
