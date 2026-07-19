import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import type MapViewType from "react-native-maps";
import { FieldMapView } from "../../../src/components/map/FieldMapView";
import type { MapCoordinate, MapPin } from "../../../src/components/map/FieldMapView.types";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import {
  ensureLocationReadyForVisit,
  promptFixLocationAccess
} from "../../../src/features/fieldTrackingSetup";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import {
  DEFAULT_MAP_REGION,
  fitFieldMapRegion,
  SINGLE_POINT_MAP_DELTA
} from "../../../src/utils/mapRegion";
import { MAP_FILL_MIN_HEIGHT } from "../../../src/utils/responsiveLayout";
import { coordsSignature, spreadDuplicateMapCoordinates } from "../../lib/dayMapMarkerLayout";
import { readPendingVisits, type PendingVisitRecord } from "../../lib/pendingVisitsQueue";
import { subscribeVisitDataRefresh } from "../../lib/visit/visitDataRefresh";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const MAP_HEIGHT = 240;
/** Day map framing — avoid city/district zoom-out. */
const DAY_FIT_OPTIONS = { padding: 1.28, minDelta: 0.008, maxDelta: 0.048 } as const;
const DAY_SINGLE_DELTA = Math.min(SINGLE_POINT_MAP_DELTA, 0.011);

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

function resolveLiveCoordinate(
  dutyMap: ReturnType<typeof useDuty>["dutyMap"],
  currentLocation: { latitude: string; longitude: string } | null
): MapCoordinate | null {
  if (dutyMap?.currentLiveLocation) {
    return dutyMap.currentLiveLocation;
  }
  if (!currentLocation) return null;
  const lat = Number(currentLocation.latitude);
  const lng = Number(currentLocation.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return null;
  return { latitude: lat, longitude: lng };
}

/**
 * Marker-only camera frame: Start + visits + End.
 * Never uses GPS breadcrumb / routePoints (admin keeps those server-side).
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

  return points;
}

export function DutyMapCard({
  fill = false,
  hideTitle = false,
  onMarkerPress,
  onPendingMarkerPress
}: Props) {
  const { t } = useI18n();
  const { currentDuty, dutyMap, refreshDutyMap } = useDuty();
  const { currentLocation, permissionDenied, gpsEnabled, refreshTrackingState } = useTracking();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const estimatedFillHeight = Math.max(MAP_FILL_MIN_HEIGHT, Math.round(windowHeight * 0.42));
  const [previewWidth, setPreviewWidth] = useState(() => Math.max(1, Math.round(windowWidth - Spacing.lg * 2)));
  const [previewHeight, setPreviewHeight] = useState(() => (fill ? estimatedFillHeight : MAP_HEIGHT));
  const [pendingVisits, setPendingVisits] = useState<PendingVisitRecord[]>([]);
  const [fitNonce, setFitNonce] = useState(0);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const mapRef = useRef<MapViewType | null>(null);

  const dutyActive = Boolean(currentDuty?.is_active);
  const liveRaw = useMemo(
    () => resolveLiveCoordinate(dutyMap, currentLocation),
    [currentLocation, dutyMap]
  );
  /** Live blue pin only while workday is active — removed when ended. */
  const live = dutyActive ? liveRaw : null;
  const showNativeLive = dutyActive && gpsEnabled && !permissionDenied;
  const showCustomLive = Boolean(dutyActive && !showNativeLive && live);

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

  /** Stable framing key — markers only (live GPS must not refit). */
  const stableFitSignature = useMemo(
    () => coordsSignature(fitCoordinates),
    [fitCoordinates]
  );

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

    // Custom blue "You" only when native user-location dot is unavailable.
    if (showCustomLive && live) {
      rows.push({
        id: "current-live",
        lat: live.latitude,
        lng: live.longitude,
        title: t("myLocation.legendYou"),
        description: t("myLocation.liveLocationHint"),
        kind: "current"
      });
    }

    return spreadDuplicateMapCoordinates(rows);
  }, [dutyMap, live, pendingVisits, showCustomLive, t]);

  const mapRegion = useMemo(() => {
    if (fitCoordinates.length === 0) return DEFAULT_MAP_REGION;
    if (fitCoordinates.length === 1) {
      return {
        latitude: fitCoordinates[0].latitude,
        longitude: fitCoordinates[0].longitude,
        latitudeDelta: DAY_SINGLE_DELTA,
        longitudeDelta: DAY_SINGLE_DELTA
      };
    }
    return fitFieldMapRegion(
      fitCoordinates.map((p) => ({ lat: p.latitude, lng: p.longitude })),
      DEFAULT_MAP_REGION,
      DAY_FIT_OPTIONS
    );
  }, [fitCoordinates]);

  const cameraFitKey = useMemo(() => {
    const dutyKey = String(dutyMap?.dutyId ?? dutyMap?.workdayId ?? "none");
    return `${dutyKey}|${stableFitSignature}|n${fitNonce}|r${mapRetryKey}`;
  }, [dutyMap?.dutyId, dutyMap?.workdayId, fitNonce, mapRetryKey, stableFitSignature]);

  const mapHeight = fill ? Math.max(MAP_FILL_MIN_HEIGHT, previewHeight) : MAP_HEIGHT;
  const showMap = previewWidth > 0 && mapHeight > 0;
  const hasStart = Boolean(dutyMap?.startMarker);
  const hasEnd = Boolean(dutyMap?.endMarker);
  const hasVisit = (dutyMap?.visitMarkers?.length ?? 0) > 0 || pendingVisits.some((v) => pendingCoord(v));
  const hasLive = showNativeLive || showCustomLive;
  const visitCount = dutyMap?.visitMarkers?.length ?? 0;
  const pendingCount = pendingVisits.filter((v) => pendingCoord(v)).length;
  const isEmpty = markers.length === 0 && !showNativeLive;
  const mapSummary = t("a11y.mapSummary", { visits: visitCount, pending: pendingCount });
  const needsLocationFix = permissionDenied || (!gpsEnabled && !live);

  const emptyMessage = !hasStart
    ? t("myLocation.noVisitsMapHint")
    : t("myLocation.noVisitsYetOnMap");

  const handleFitAll = useCallback(() => {
    setFitNonce((n) => n + 1);
  }, []);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (live && map) {
      try {
        map.animateToRegion(
          {
            latitude: live.latitude,
            longitude: live.longitude,
            latitudeDelta: DAY_SINGLE_DELTA,
            longitudeDelta: DAY_SINGLE_DELTA
          },
          420
        );
        return;
      } catch {
        // fall through to fit-all
      }
    }
    handleFitAll();
  }, [handleFitAll, live]);

  const handleRetry = useCallback(() => {
    setMapRetryKey((n) => n + 1);
    void refreshDutyMap().catch(() => undefined);
    void refreshTrackingState().catch(() => undefined);
  }, [refreshDutyMap, refreshTrackingState]);

  const handleFixLocation = useCallback(() => {
    void (async () => {
      const result = await ensureLocationReadyForVisit().catch(() => null);
      if (!result || result.ok) {
        void refreshTrackingState().catch(() => undefined);
        return;
      }
      promptFixLocationAccess(result, {
        onRetry: () => {
          void refreshTrackingState().catch(() => undefined);
          void refreshDutyMap().catch(() => undefined);
        }
      });
    })();
  }, [refreshDutyMap, refreshTrackingState]);

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
              key={`day-map-${mapRetryKey}`}
              screenName="DutyMapCard"
              height={mapHeight}
              width={previewWidth}
              region={mapRegion}
              markers={markers}
              /* Marker-only employee map — never draw GPS breadcrumbs. */
              route={[]}
              cameraMode="cappedRegion"
              cameraFitKey={cameraFitKey}
              fitCoordinates={fitCoordinates.length ? fitCoordinates : undefined}
              fitEdgePadding={
                fill
                  ? { top: 56, right: 52, bottom: 52, left: 52 }
                  : { top: 36, right: 36, bottom: 40, left: 36 }
              }
              mapRef={mapRef}
              showsUserLocation={showNativeLive}
              locationGranted={showNativeLive}
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

            {!isEmpty || hasLive ? (
              <View
                style={styles.legend}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {hasStart ? (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBadge, { backgroundColor: "#16A34A" }]}>
                      <Text style={styles.legendBadgeText}>S</Text>
                    </View>
                    <Text style={styles.legendText}>{t("myLocation.legendRouteStart")}</Text>
                  </View>
                ) : null}
                {hasVisit ? (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBadge, { backgroundColor: "#0B6B3A" }]}>
                      <Text style={styles.legendBadgeText}>1</Text>
                    </View>
                    <Text style={styles.legendText}>{t("myLocation.legendVisit")}</Text>
                  </View>
                ) : null}
                {hasLive ? (
                  <View style={styles.legendItem}>
                    <View style={[styles.legendBadge, styles.legendLive]}>
                      <View style={styles.legendLiveDot} />
                    </View>
                    <Text style={styles.legendText}>{t("myLocation.legendYouShort")}</Text>
                  </View>
                ) : null}
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

            {!isEmpty || hasLive ? (
              <View style={styles.controls} pointerEvents="box-none">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("myLocation.locateMe")}
                  onPress={handleRecenter}
                  style={styles.controlBtn}
                >
                  <Ionicons name="locate-outline" size={18} color={Colors.brand700} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("myLocation.fitRoute")}
                  onPress={handleFitAll}
                  style={styles.controlBtn}
                >
                  <Ionicons name="scan-outline" size={18} color={Colors.brand700} />
                </Pressable>
              </View>
            ) : null}

            {isEmpty ? (
              <View style={styles.emptyOverlay} pointerEvents="box-none">
                <Text style={styles.emptyTitle}>{emptyMessage}</Text>
                <View style={styles.emptyActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleRetry}
                    style={styles.emptyBtn}
                  >
                    <Ionicons name="refresh-outline" size={16} color={Colors.brand700} />
                    <Text style={styles.emptyBtnText}>Retry</Text>
                  </Pressable>
                  {needsLocationFix ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleFixLocation}
                      style={styles.emptyBtn}
                    >
                      <Ionicons name="location-outline" size={16} color={Colors.brand700} />
                      <Text style={styles.emptyBtnText}>Fix Location</Text>
                    </Pressable>
                  ) : null}
                </View>
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
    paddingTop: Spacing.xs
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
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(15, 40, 28, 0.08)",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 5,
    left: 10,
    maxWidth: "52%",
    paddingHorizontal: 8,
    paddingVertical: 7,
    position: "absolute",
    top: 10
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  legendBadge: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1.5,
    height: 16,
    justifyContent: "center",
    width: 16
  },
  legendBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800"
  },
  legendLive: {
    backgroundColor: "#2563EB"
  },
  legendLiveDot: {
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    height: 6,
    width: 6
  },
  legendText: {
    color: Colors.text2,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: FontWeight.semibold
  },
  controls: {
    gap: 8,
    position: "absolute",
    right: 10,
    top: 10
  },
  controlBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: 36,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    width: 36
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(232, 240, 234, 0.92)",
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  emptyTitle: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center"
  },
  emptyBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  emptyBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  }
});
