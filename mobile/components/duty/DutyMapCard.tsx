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
import {
  buildEmployeeDayFitCoordinates,
  buildEmployeeDayMapMarkers
} from "../../../src/features/duty/map/employeeDayMapMarkers";
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
  /** @deprecated Pending/draft visits are not shown on the Day map. */
  onPendingMarkerPress?: (localSyncId: string) => void;
};

/**
 * Marker-only Day map: Start + submitted Visits + End (when ended).
 * No polyline, trail points, draft visits, or live pins in the marker set.
 */
export function DutyMapCard({
  fill = false,
  hideTitle = false,
  onMarkerPress,
  onPendingMarkerPress: _onPendingMarkerPress
}: Props) {
  void _onPendingMarkerPress;
  const { t } = useI18n();
  const { currentDuty, dutyMap, refreshDutyMap } = useDuty();
  const { permissionDenied, gpsEnabled, refreshTrackingState } = useTracking();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const estimatedFillHeight = Math.max(MAP_FILL_MIN_HEIGHT, Math.round(windowHeight * 0.42));
  const [previewWidth, setPreviewWidth] = useState(() => Math.max(1, Math.round(windowWidth - Spacing.lg * 2)));
  const [previewHeight, setPreviewHeight] = useState(() => (fill ? estimatedFillHeight : MAP_HEIGHT));
  const [fitNonce, setFitNonce] = useState(0);
  const [mapRetryKey, setMapRetryKey] = useState(0);
  const mapRef = useRef<MapViewType | null>(null);

  const dutyActive = Boolean(currentDuty?.is_active);
  const workdayEnded = Boolean(
    currentDuty &&
      !currentDuty.is_active &&
      (Boolean(currentDuty.ended_at) ||
        Boolean(currentDuty.end_time) ||
        currentDuty.is_active === false)
  );

  useEffect(() => {
    if (!fill) return;
    setPreviewHeight((prev) => (prev < MAP_FILL_MIN_HEIGHT ? estimatedFillHeight : prev));
  }, [estimatedFillHeight, fill]);

  const markers = useMemo(() => {
    const rows = buildEmployeeDayMapMarkers({
      dutyMap,
      workdayEnded,
      labels: {
        startTitle: t("myLocation.legendRouteStart"),
        startDescription: t("myLocation.workStartHint"),
        visitTitle: t("myLocation.legendVisit"),
        endTitle: t("myLocation.legendRouteEnd"),
        endDescription: t("myLocation.workEndHint")
      }
    });
    return spreadDuplicateMapCoordinates(rows);
  }, [dutyMap, t, workdayEnded]);

  const fitCoordinates = useMemo(
    () => buildEmployeeDayFitCoordinates(markers),
    [markers]
  );

  /** Stable framing key — markers only (live GPS must not refit). */
  const stableFitSignature = useMemo(
    () => coordsSignature(fitCoordinates),
    [fitCoordinates]
  );

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
  const hasStart = markers.some((m) => m.kind === "route_start");
  const hasEnd = markers.some((m) => m.kind === "route_end");
  const hasVisit = markers.some((m) => m.kind === "visit");
  const visitCount = markers.filter((m) => m.kind === "visit").length;
  const isEmpty = markers.length === 0;
  const mapSummary = t("a11y.mapSummary", { visits: visitCount, pending: 0 });
  const needsLocationFix = dutyActive && (permissionDenied || !gpsEnabled);

  const emptyMessage = !hasStart
    ? t("myLocation.noVisitsMapHint")
    : t("myLocation.noVisitsYetOnMap");

  const handleFitAll = useCallback(() => {
    setFitNonce((n) => n + 1);
  }, []);

  const handleRecenter = useCallback(() => {
    handleFitAll();
  }, [handleFitAll]);

  const handleRetry = useCallback(() => {
    setMapRetryKey((n) => n + 1);
    void refreshDutyMap({ force: true }).catch(() => undefined);
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
          void refreshDutyMap({ force: true }).catch(() => undefined);
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
              showsUserLocation={false}
              locationGranted={false}
              followsUserLocation={false}
              permissionResolved
              loading={false}
              interactive
              emptyMessage={isEmpty ? emptyMessage : undefined}
              onMarkerPress={
                onMarkerPress
                  ? (marker) => {
                      if (marker.visitId != null) onMarkerPress(marker.visitId);
                    }
                  : undefined
              }
            />

            {!isEmpty ? (
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

            {!isEmpty ? (
              <View style={styles.controls} pointerEvents="box-none">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("myLocation.locateMe")}
                  onPress={handleFitAll}
                  style={styles.controlBtn}
                >
                  <Ionicons name="scan-outline" size={18} color={Colors.text1} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("common.retry")}
                  onPress={handleRetry}
                  style={styles.controlBtn}
                >
                  <Ionicons name="refresh" size={18} color={Colors.text1} />
                </Pressable>
              </View>
            ) : null}

            {needsLocationFix ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleFixLocation}
                style={styles.fixBanner}
              >
                <Text style={styles.fixBannerText}>{t("workdayUx.locationPermissionRequired")}</Text>
              </Pressable>
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
    marginHorizontal: Spacing.screen
  },
  fillSection: {
    flex: 1,
    gap: Spacing.sm,
    minHeight: MAP_FILL_MIN_HEIGHT
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold
  },
  mapWrap: {
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    height: MAP_HEIGHT,
    overflow: "hidden"
  },
  fillMapWrap: {
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: MAP_FILL_MIN_HEIGHT,
    overflow: "hidden"
  },
  mapStack: {
    flex: 1
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  legend: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: Radius.inner,
    gap: 6,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    top: Spacing.sm
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  legendBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 18,
    justifyContent: "center",
    width: 18
  },
  legendBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: FontWeight.bold
  },
  legendText: {
    color: Colors.text2,
    fontSize: FontSize.caption
  },
  controls: {
    gap: Spacing.sm,
    position: "absolute",
    right: Spacing.sm,
    top: Spacing.sm
  },
  controlBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  fixBanner: {
    backgroundColor: Colors.amberBg,
    bottom: 0,
    left: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    position: "absolute",
    right: 0
  },
  fixBannerText: {
    color: Colors.amberText,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    textAlign: "center"
  }
});
