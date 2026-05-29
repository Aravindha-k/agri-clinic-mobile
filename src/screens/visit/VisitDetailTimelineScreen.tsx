import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Farmer, getFarmer } from "../../api/farmers";
import { getVisit, Visit } from "../../api/visits";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { ErrorState } from "../../components/ErrorState";
import { AppHeader, PremiumCard, SkeletonCard, TimelineItem } from "../../components/ui";
import { VisitsStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme";
import { getVisitDisplayDateTime } from "../../utils/format";
import { VisitEvidenceSection } from "../../components/visit/VisitEvidenceSection";
import { buildVisitTimelineEvents } from "../../utils/visitTimeline";
import { extractPhotoUrl } from "../../utils/profilePhotoUrl";
import { normalizeVisitFromApi, resolveVisitFarmer } from "../../utils/visitFarmer";

type Props = NativeStackScreenProps<VisitsStackParamList, "VisitDetail">;

export function VisitDetailTimelineScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [visit, setVisit] = useState<Visit | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const visitRow = normalizeVisitFromApi(await getVisit(route.params.id));
      setVisit(visitRow);
      const farmerId = visitRow.farmer?.id;
      if (farmerId) {
        try {
          setFarmerProfile(await getFarmer(farmerId));
        } catch {
          setFarmerProfile(null);
        }
      } else {
        setFarmerProfile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load visit.");
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [load, navigation]);

  const farmer = visit ? resolveVisitFarmer(visit) : null;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const events = useMemo(() => (visit && farmer ? buildVisitTimelineEvents(visit, farmer) : []), [visit, farmer]);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: c.background }]}>
        <AppHeader title="Visit" onBack={() => navigation.goBack()} />
        <View style={styles.pad}>
          <SkeletonCard lines={4} />
        </View>
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!visit || !farmer) return null;

  const hasGps = Boolean(visit.latitude && visit.longitude);
  const when = getVisitDisplayDateTime(visit);

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader
        title={farmer.name !== "—" ? farmer.name : "Visit"}
        subtitle={when}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <PremiumCard elevated tint="soft">
          <View style={styles.farmerRow}>
            <ProfileAvatar
              name={farmer.name !== "—" ? farmer.name : undefined}
              photoUrl={extractPhotoUrl(farmerProfile)}
              size="md"
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: c.text }]}>{farmer.name !== "—" ? farmer.name : "Farmer"}</Text>
              <Text style={{ color: c.muted, fontSize: 14, marginTop: 4 }}>
                {[farmer.village !== "—" ? farmer.village : null, farmer.cropName !== "—" ? farmer.cropName : null]
                  .filter(Boolean)
                  .join(" · ") || "Not recorded"}
              </Text>
            </View>
          </View>
        </PremiumCard>
        <PremiumCard elevated tint="soft" style={styles.gpsCard}>
          <View style={styles.gpsRow}>
            <View style={[styles.gpsIcon, { backgroundColor: hasGps ? c.successSoft : c.cardMuted }]}>
              <Ionicons name="location" size={22} color={hasGps ? c.success : c.muted} />
            </View>
            <View style={styles.gpsCopy}>
              <Text style={[styles.gpsTitle, { color: c.text }]}>{hasGps ? "GPS captured" : "No GPS on record"}</Text>
              <Text style={{ color: c.muted, fontSize: 13, lineHeight: 19 }}>
                {hasGps ? `Lat ${visit.latitude} · Lng ${visit.longitude}` : "Location was not captured for this visit."}
              </Text>
            </View>
          </View>
        </PremiumCard>

        <VisitEvidenceSection visitId={visit.id} />

        <Text style={[styles.section, { color: c.muted }]}>Visit timeline</Text>
        <PremiumCard elevated style={styles.timelineCard}>
          {events.map((e, i) => (
            <TimelineItem
              key={e.title}
              title={e.title}
              subtitle={e.subtitle}
              body={e.body}
              icon={e.icon}
              isFirst={i === 0}
              isLast={i === events.length - 1}
            />
          ))}
        </PremiumCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { gap: 14, padding: 16, paddingBottom: 32 },
  farmerRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  summaryTitle: { fontSize: 18, fontWeight: "900" },
  gpsCard: { marginBottom: 0 },
  gpsRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  gpsIcon: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  gpsCopy: { flex: 1 },
  gpsTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  section: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, marginTop: 4, textTransform: "uppercase" },
  timelineCard: { paddingVertical: 12 }
});
