import { Ionicons } from "@expo/vector-icons";

import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { ErrorState } from "../../components/ErrorState";

import { FieldMapView } from "../../components/map/FieldMapView";

import { AppHeader } from "../../components/ui";

import { useMapAreaHeight } from "../../hooks/useMapAreaHeight";

import { RootStackParamList } from "../../navigation/types";

import { useTracking } from "../../storage/TrackingContext";

import { useTheme } from "../../theme";

import { fontWeights } from "../../theme/fontWeights";

import { formatShortDateTime } from "../../utils/format";

import { getForegroundLocation } from "../../utils/location";

import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";

import { fitMapRegion } from "../../utils/mapRegion";



type Props = NativeStackScreenProps<RootStackParamList, "LiveMap">;



export function LiveMapScreen({ navigation }: Props) {

  const { theme } = useTheme();

  const c = theme.colors;

  const { width } = useWindowDimensions();

  const mapHeight = useMapAreaHeight(112);

  const { isActive, lastSyncTime, currentLocation, refreshTracking, retryForegroundSync, fieldLocationBlocked, error } =

    useTracking();



  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null);

  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const [permissionResolved, setPermissionResolved] = useState(false);

  const [label, setLabel] = useState("Locating…");



  const loadLive = useCallback(async () => {
    setPermissionResolved(false);
    try {

      const result = await getForegroundLocation();

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

      setHasLocationPermission(false);

      setLive(null);

      setLabel("Location unavailable");

    } finally {
      setPermissionResolved(true);
    }

  }, []);



  useEffect(() => {

    void loadLive();

    const id = setInterval(() => void loadLive(), 30000);

    return () => clearInterval(id);

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

    return fitMapRegion(points);

  }, [live, serverPin]);



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



        <FieldMapView

          height={mapHeight}

          width={width - 32}

          region={region}

          permissionResolved={permissionResolved}

          locationDenied={permissionResolved && !hasLocationPermission}

          loading={!permissionResolved}

          showsUserLocation={hasLocationPermission}

          followsUserLocation={isActive && hasLocationPermission}

          markers={

            serverPin

              ? [

                  {

                    id: "last-checkin",

                    lat: serverPin.lat,

                    lng: serverPin.lng,

                    title: "Last check-in",

                    description: lastSyncTime ? formatShortDateTime(lastSyncTime) : undefined,

                    pinColor: c.primaryDark

                  }

                ]

              : []

          }

        />



        <Text style={[styles.hint, { color: c.muted }]}>

          {isActive

            ? "Blue dot is you now. Green pin is your last saved check-in while working."

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

  hint: { fontSize: 13, lineHeight: 19, textAlign: "center" }

});


