import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FieldMapView } from "../../../src/components/map/FieldMapView";
import type { MapPin } from "../../../src/components/map/FieldMapView.types";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../../../src/utils/mapRegion";
import { readPendingVisits, type PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { subscribeVisitDataRefresh } from "../../lib/visit/visitDataRefresh";
import { Colors, FontSize, Spacing } from "../../lib/theme";

const MAP_HEIGHT = 240;

type Props = {
  onMarkerPress?: (visitId: number | string) => void;
  onPendingMarkerPress?: (localSyncId: string) => void;
};

function pendingCoord(visit: PendingVisitRecord): { lat: number; lng: number } | null {
  const lat = Number(visit.values.latitude);
  const lng = Number(visit.values.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;
  return { lat, lng };
}

export function DutyMapCard({ onMarkerPress, onPendingMarkerPress }: Props) {
  const { t } = useI18n();
  const { dutyMap } = useDuty();
  const [previewWidth, setPreviewWidth] = useState(0);
  const [pendingVisits, setPendingVisits] = useState<PendingVisitRecord[]>([]);

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

  const fitCoordinates = useMemo(() => {
    const bounds = dutyMap?.bounds?.length ? [...dutyMap.bounds] : [];
    for (const visit of pendingVisits) {
      const coord = pendingCoord(visit);
      if (coord) bounds.push({ latitude: coord.lat, longitude: coord.lng });
    }
    return bounds;
  }, [dutyMap?.bounds, pendingVisits]);

  const markers = useMemo((): MapPin[] => {
    const rows: MapPin[] = [];
    const serverKeys = new Set<string>();
    for (const marker of dutyMap?.visitMarkers ?? []) {
      serverKeys.add(String(marker.id));
      if (marker.visitId != null) serverKeys.add(String(marker.visitId));
    }

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

    for (const marker of dutyMap?.visitMarkers ?? []) {
      rows.push({
        ...marker,
        id: marker.visitId != null ? `visit-${marker.visitId}` : marker.id,
        label: marker.sequence,
        pending: Boolean(marker.pending)
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

    if (dutyMap?.currentLiveLocation) {
      rows.push({
        id: "current-live",
        lat: dutyMap.currentLiveLocation.latitude,
        lng: dutyMap.currentLiveLocation.longitude,
        title: t("myLocation.legendYou"),
        description: t("myLocation.liveLocationHint"),
        kind: "current"
      });
    }
    if (dutyMap?.endMarker) {
      rows.push({
        id: "route-end",
        lat: dutyMap.endMarker.latitude,
        lng: dutyMap.endMarker.longitude,
        title: t("daySummary.endWorkday"),
        kind: "route_end"
      });
    }
    return rows;
  }, [dutyMap, pendingVisits, t]);

  const mapRegion = useMemo(() => {
    if (fitCoordinates.length === 0) return DEFAULT_MAP_REGION;
    return fitMapRegion(fitCoordinates.map((p) => ({ lat: p.latitude, lng: p.longitude })));
  }, [fitCoordinates]);

  const showMap = previewWidth > 0;
  const isEmpty = markers.length === 0;
  const visitCount = dutyMap?.visitMarkers?.length ?? 0;
  const pendingCount = pendingVisits.filter((v) => pendingCoord(v)).length;
  const mapSummary = t("a11y.mapSummary", { visits: visitCount, pending: pendingCount });

  return (
    <View
      style={styles.section}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${t("daySummary.routeSummary")}. ${mapSummary}`}
    >
      <Text style={styles.title} accessibilityRole="header">
        {t("daySummary.routeSummary")}
      </Text>
      <View
        style={styles.mapWrap}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0) setPreviewWidth(w);
        }}
      >
        {!showMap ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.brand700} />
          </View>
        ) : (
          <FieldMapView
            screenName="DutyMapCard"
            height={MAP_HEIGHT}
            width={previewWidth}
            region={mapRegion}
            markers={markers}
            fitCoordinates={fitCoordinates.length ? fitCoordinates : undefined}
            fitEdgePadding={{ top: 36, right: 36, bottom: 36, left: 36 }}
            showsUserLocation={false}
            locationGranted={false}
            followsUserLocation={false}
            permissionResolved
            loading={false}
            interactive
            emptyMessage={isEmpty ? t("myLocation.noRouteMapHint") : undefined}
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
  title: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: "700"
  },
  mapWrap: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    height: MAP_HEIGHT,
    overflow: "hidden",
    width: "100%"
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
