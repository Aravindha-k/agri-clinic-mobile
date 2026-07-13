import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FieldMapView } from "../../components/map/FieldMapView";
import { MapErrorBoundary } from "../../components/map/MapErrorBoundary";
import { MyLocationBottomSheet } from "../../components/myLocation/MyLocationBottomSheet";
import { MyLocationHeader } from "../../components/myLocation/MyLocationHeader";
import { MyLocationLivePill } from "../../components/myLocation/MyLocationLivePill";
import { MyLocationMapFab } from "../../components/myLocation/MyLocationMapFab";
import { MyLocationMapLegend } from "../../components/myLocation/MyLocationMapLegend";
import { MyLocationMetricsRow } from "../../components/myLocation/MyLocationMetricsRow";
import { useMyLocationScreen } from "../../hooks/useMyLocationScreen";
import { useSecureScreen } from "../../hooks/useSecureScreen";
import { useI18n } from "../../i18n/I18nContext";
import { RootStackParamList } from "../../navigation/types";
import { hasValidMapCoords } from "../../utils/mapCoords";
import { Colors } from "../../../mobile/lib/theme";
import { ScreenCanvas } from "../../../mobile/components/layout";

type Props = NativeStackScreenProps<RootStackParamList, "MyLocation" | "TravelHistory" | "LiveMap">;

function mapScreenCopy(routeName: string, t: (key: string) => string) {
  if (routeName === "LiveMap") {
    return {
      title: t("myLocation.title"),
      subtitle: t("myLocation.liveTracking")
    };
  }
  if (routeName === "TravelHistory") {
    return {
      title: t("myLocation.title"),
      subtitle: t("myLocation.todaysDistance")
    };
  }
  return {
    title: t("myLocation.title"),
    subtitle: t("home.fieldOperations")
  };
}

export function MyLocationScreen({ navigation, route }: Props) {
  useSecureScreen();
  const { t } = useI18n();
  const headerCopy = useMemo(() => mapScreenCopy(route.name, t), [route.name, t]);
  const [mapHeight, setMapHeight] = useState(320);
  const [mapWidth, setMapWidth] = useState(0);

  const {
    mapRef,
    isActive,
    hasLiveGps,
    startedAt,
    lastSyncTime,
    distanceKm,
    accuracyMeters,
    isSyncing,
    refreshing,
    liveCoordinate,
    accuracyCircle,
    markers,
    mapRegion,
    fitCoordinates,
    routeLine,
    visitsToday,
    emptyStateKey,
    refresh,
    centerOnVisit,
    locateMe,
    fitRoute
  } = useMyLocationScreen();

  const followLive = hasLiveGps && isActive;

  const emptyMessage = useMemo(() => {
    if (emptyStateKey === "noWorkday") return t("myLocation.empty.noWorkday");
    if (emptyStateKey === "noGps") return t("myLocation.empty.noGps");
    if (emptyStateKey === "offline") return t("myLocation.empty.offline");
    return undefined;
  }, [emptyStateKey, t]);

  const openExternalMaps = useCallback(() => {
    void (async () => {
      const { getForegroundLocation } = await import("../../utils/location");
      const fix = await getForegroundLocation().catch(() => null);
      if (!fix?.granted) return;
      const la = fix.location.coords.latitude;
      const ln = fix.location.coords.longitude;
      if (la == null || ln == null || !hasValidMapCoords(la, ln)) return;
      const url =
        Platform.OS === "ios"
          ? `maps://?q=${la},${ln}`
          : `geo:${la},${ln}?q=${la},${ln}`;
      void Linking.openURL(url).catch(() => {
        void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${la},${ln}`);
      });
    })();
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenCanvas />
      <MyLocationHeader
        trackingActive={isActive && hasLiveGps}
        onBack={() => navigation.goBack()}
        onRefresh={() => void refresh()}
        title={headerCopy.title}
        subtitle={headerCopy.subtitle}
      />

      <MyLocationMetricsRow
        startedAt={startedAt}
        distanceKm={distanceKm}
        lastSyncTime={lastSyncTime}
        accuracyMeters={accuracyMeters}
        syncing={isSyncing || refreshing}
      />

      <View
        style={styles.mapWrap}
        onLayout={(e) => {
          setMapHeight(Math.max(e.nativeEvent.layout.height, 240));
          setMapWidth(e.nativeEvent.layout.width);
        }}
      >
        {mapWidth > 0 ? (
          <MapErrorBoundary height={mapHeight} screenName="MyLocationScreen">
            <FieldMapView
              screenName="MyLocationScreen"
              height={mapHeight}
              width={mapWidth}
              region={mapRegion}
              route={routeLine}
              fitCoordinates={fitCoordinates}
              fitEdgePadding={{ top: 72, right: 56, bottom: 88, left: 40 }}
              markers={markers}
              mapRef={mapRef}
              showsUserLocation={hasLiveGps}
              followsUserLocation={followLive}
              liveFocus={followLive ? liveCoordinate : null}
              liveFocusDelta={0.005}
              locationGranted={hasLiveGps}
              permissionResolved
              locationDenied={false}
              loading={false}
              emptyMessage={emptyMessage}
              accuracyCircle={accuracyCircle}
            />
          </MapErrorBoundary>
        ) : null}

        <MyLocationLivePill active={followLive} />
        <MyLocationMapLegend />
        <MyLocationMapFab
          onLocateMe={locateMe}
          onFitRoute={fitRoute}
          onNavigate={openExternalMaps}
        />
      </View>

      <MyLocationBottomSheet
        visits={visitsToday}
        distanceKm={distanceKm}
        visitCount={visitsToday.length}
        onSelectVisit={centerOnVisit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "transparent",
    flex: 1
  },
  mapWrap: {
    backgroundColor: Colors.surface,
    flex: 1,
    minHeight: 240,
    overflow: "hidden"
  }
});
