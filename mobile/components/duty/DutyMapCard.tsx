import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FieldMapView } from "../../../src/components/map/FieldMapView";
import type { MapPin } from "../../../src/components/map/FieldMapView.types";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { DEFAULT_MAP_REGION, fitMapRegion } from "../../../src/utils/mapRegion";
import { Colors, FontSize, Spacing } from "../../lib/theme";

const MAP_HEIGHT = 240;

type Props = {
  onMarkerPress?: (visitId: number | string) => void;
};

export function DutyMapCard({ onMarkerPress }: Props) {
  const { t } = useI18n();
  const { dutyMap } = useDuty();
  const [previewWidth, setPreviewWidth] = useState(0);

  const fitCoordinates = useMemo(
    () => (dutyMap?.bounds?.length ? dutyMap.bounds : []),
    [dutyMap?.bounds]
  );

  const markers = useMemo((): MapPin[] => {
    const rows: MapPin[] = [];
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
        label: marker.sequence,
        pending: marker.pending
      });
    }
    if (dutyMap?.currentLiveLocation) {
      rows.push({
        id: "current-live",
        lat: dutyMap.currentLiveLocation.latitude,
        lng: dutyMap.currentLiveLocation.longitude,
        title: "Current location",
        kind: "current"
      });
    }
    if (dutyMap?.endMarker) {
      rows.push({
        id: "route-end",
        lat: dutyMap.endMarker.latitude,
        lng: dutyMap.endMarker.longitude,
        title: "Work end",
        kind: "route_end"
      });
    }
    return rows;
  }, [dutyMap, t]);

  const mapRegion = useMemo(() => {
    if (fitCoordinates.length === 0) return DEFAULT_MAP_REGION;
    return fitMapRegion(fitCoordinates.map((p) => ({ lat: p.latitude, lng: p.longitude })));
  }, [fitCoordinates]);

  const showMap = previewWidth > 0;
  const isEmpty = markers.length === 0;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t("daySummary.routeSummary")}</Text>
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
              onMarkerPress
                ? (marker) => {
                    if (marker.visitId != null) onMarkerPress(marker.visitId);
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
