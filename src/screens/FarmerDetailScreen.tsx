import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Farmer, getFarmer, getFarmerActivity, getFarmerFields, getFarmerVisits } from "../api/farmers";
import { Visit } from "../api/visits";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FadeInView } from "../components/FadeInView";
import { FarmerDetailSkeleton } from "../components/farmer/FarmerDetailSkeleton";
import { FarmerOverviewStats } from "../components/farmer/FarmerOverviewStats";
import { FarmerProfileHeader } from "../components/farmer/FarmerProfileHeader";
import { FarmerTimelineCard } from "../components/farmer/FarmerTimelineCard";
import { FarmerVisitHistoryCard } from "../components/farmer/FarmerVisitHistoryCard";
import { AppHeader, FilterChips, PrimaryButton } from "../components/ui";
import { useGpsWorkGuard } from "../hooks/useGpsWorkGuard";
import { useSecureScreen } from "../hooks/useSecureScreen";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { FarmersStackParamList } from "../navigation/types";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { asArray, getVisitDisplayDateTime } from "../utils/format";
import { navigateFarmerMap } from "../navigation/navigateFarmerMap";
import { prefillFromFarmer } from "../utils/farmerPrefill";
import {
  buildFarmerTimeline,
  countOpenIssues,
  extractRecommendations
} from "../utils/farmerTimeline";

type Props = NativeStackScreenProps<FarmersStackParamList, "FarmerDetail">;

type TabKey = "Overview" | "Fields" | "Visits" | "Recommendations" | "Timeline";

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: "Overview", label: "Overview" },
  { key: "Fields", label: "Fields" },
  { key: "Visits", label: "Visit History" },
  { key: "Recommendations", label: "Recommendations" },
  { key: "Timeline", label: "Timeline" }
];

export function FarmerDetailScreen({ route, navigation }: Props) {
  useSecureScreen();
  const { colors, type, shadows } = useDesignSystem();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [fields, setFields] = useState<unknown[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [activity, setActivity] = useState<unknown[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("Overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { bumpAfterFarmerPhotoChange } = useFieldDataRefresh();
  const { canRunWorkAction } = useGpsWorkGuard();
  const refreshControlProps = useRefreshControlProps();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      const [farmerData, fieldData, visitData, activityData] = await Promise.all([
        getFarmer(route.params.id),
        getFarmerFields(route.params.id),
        getFarmerVisits(route.params.id),
        getFarmerActivity(route.params.id)
      ]);
      setFarmer(farmerData);
      setFields(asArray(fieldData));
      setVisits(visitData);
      setActivity(asArray(activityData));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load farmer.");
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => visitTimestamp(b) - visitTimestamp(a));
  }, [visits]);

  const timeline = useMemo(() => buildFarmerTimeline(visits, activity), [visits, activity]);
  const recommendations = useMemo(() => extractRecommendations(visits), [visits]);
  const openIssues = useMemo(() => countOpenIssues(visits), [visits]);

  const lastVisitedLabel = useMemo(() => {
    const latest = sortedVisits[0];
    if (!latest) return "—";
    return getVisitDisplayDateTime(latest) || "—";
  }, [sortedVisits]);

  function openAddVisit() {
    if (!farmer) return;
    if (!canRunWorkAction()) return;
    navigation.getParent()?.getParent()?.navigate("VisitFlow", {
      screen: "NewVisitFarmer",
      params: { prefill: prefillFromFarmer(farmer), fastRevisit: true }
    });
  }

  function openFarmerMap() {
    if (!farmer) return;
    navigateFarmerMap(navigation, {
      farmerId: farmer.id,
      farmerName: farmer.name,
      village: String(farmer.village_name || farmer.village || ""),
      latitude: farmer.latitude,
      longitude: farmer.longitude
    });
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title="Farmer" onBack={() => navigation.goBack()} />
        <FarmerDetailSkeleton />
      </View>
    );
  }

  if (error) return <ErrorState message={error} onRetry={() => void load(false)} />;
  if (!farmer) return null;

  const place =
    [farmer.village_name || farmer.village, farmer.district_name || farmer.district].filter(Boolean).join(", ") ||
    "Location not set";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title="Farmer profile" subtitle={farmer.name || "Farmer"} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.screen}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            {...refreshControlProps}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView>
          <FarmerProfileHeader
            farmer={farmer}
            villageLabel={place}
            onFarmerUpdated={(updated) => {
              setFarmer(updated);
              bumpAfterFarmerPhotoChange();
            }}
            onNewVisit={openAddVisit}
          />
        </FadeInView>

        <FadeInView delay={30}>
          <FarmerOverviewStats
            totalVisits={sortedVisits.length}
            lastVisitLabel={lastVisitedLabel}
            fieldsCount={fields.length}
            openIssues={openIssues}
            onVisitsPress={() => setActiveTab("Visits")}
          />
        </FadeInView>

        <FilterChips options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />

        <FadeInView key={activeTab} delay={20}>
          {activeTab === "Overview" ? (
            <View style={styles.panel}>
              <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}>
                <Text style={type.sectionTitle}>Location</Text>
                <Text style={[type.meta, { marginTop: 6 }]}>{place}</Text>
                <PrimaryButton title="View on map" variant="secondary" onPress={openFarmerMap} style={{ marginTop: 12 }} />
              </View>
              {sortedVisits.length === 0 ? (
                <EmptyState
                  title="No visits yet"
                  message="Start a field visit to build this farmer's history."
                  illustration="visits"
                  actionLabel="New visit"
                  onAction={openAddVisit}
                />
              ) : (
                sortedVisits.slice(0, 3).map((visit) => <FarmerVisitHistoryCard key={visit.id} visit={visit} />)
              )}
            </View>
          ) : null}

          {activeTab === "Fields" ? (
            <View style={styles.panel}>
              {fields.length === 0 ? (
                <EmptyState
                  title="No fields yet"
                  message="Plots and land parcels linked to this farmer will appear here."
                  illustration="map"
                />
              ) : (
                fields.map((item, index) => (
                  <View
                    key={index}
                    style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }, shadows.card]}
                  >
                    <Text style={type.cardTitle}>{fieldTitle(item)}</Text>
                    <Text style={[type.meta, { marginTop: 4 }]}>{fieldDetail(item)}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}

          {activeTab === "Visits" ? (
            <View style={styles.panel}>
              <PrimaryButton title="New visit" onPress={openAddVisit} variant="secondary" style={{ marginBottom: 4 }} />
              {sortedVisits.length === 0 ? (
                <EmptyState
                  title="No visit history"
                  message="Every field visit for this farmer is listed here."
                  illustration="visits"
                  actionLabel="Start visit"
                  onAction={openAddVisit}
                />
              ) : (
                sortedVisits.map((visit) => <FarmerVisitHistoryCard key={visit.id} visit={visit} />)
              )}
            </View>
          ) : null}

          {activeTab === "Recommendations" ? (
            <View style={styles.panel}>
              {recommendations.length === 0 ? (
                <EmptyState
                  title="No recommendations yet"
                  message="Advice you give during visits will show up here for quick reference."
                  illustration="generic"
                  actionLabel="New visit"
                  onAction={openAddVisit}
                />
              ) : (
                recommendations.map((rec) => (
                  <View
                    key={rec.id}
                    style={[styles.recCard, { backgroundColor: colors.primarySoft, borderColor: colors.borderSubtle }]}
                  >
                    <Text style={type.caption}>{rec.dateLabel}</Text>
                    <Text style={[type.bodyStrong, { color: colors.text, marginTop: 6 }]}>{rec.text}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}

          {activeTab === "Timeline" ? (
            <View style={styles.panel}>
              {timeline.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  message="Visits, recommendations, and issues will appear in chronological order."
                  illustration="generic"
                  actionLabel="New visit"
                  onAction={openAddVisit}
                />
              ) : (
                timeline.map((event, index) => (
                  <FarmerTimelineCard key={event.id} event={event} isLast={index === timeline.length - 1} />
                ))
              )}
            </View>
          ) : null}
        </FadeInView>
      </ScrollView>
    </View>
  );
}

function visitTimestamp(item: Visit) {
  const raw = item.visit_date || item.created_at || item.updated_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function fieldTitle(item: unknown) {
  if (!item || typeof item !== "object") return "Field";
  const r = item as Record<string, unknown>;
  return String(r.field_name || r.plot_name || r.name || "Field");
}

function fieldDetail(item: unknown) {
  if (!item || typeof item !== "object") return "";
  const r = item as Record<string, unknown>;
  return [r.area, r.acreage, r.crop_name, r.village_name].filter((x) => typeof x === "string" && x.trim()).join(" · ");
}

const styles = StyleSheet.create({
  screen: { gap: 16, padding: 16, paddingBottom: 32 },
  panel: { gap: 10 },
  mapCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  fieldCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  recCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14 }
});
