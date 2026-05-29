import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Farmer, getFarmer, getFarmerActivity, getFarmerFields, getFarmerVisits } from "../api/farmers";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FadeInView } from "../components/FadeInView";
import { ListSkeleton } from "../components/ListSkeleton";
import { FarmerPhotoPicker } from "../components/FarmerPhotoPicker";
import { AppHeader, FilterChips, PremiumCard, PrimaryButton } from "../components/ui";
import { useGpsWorkGuard } from "../hooks/useGpsWorkGuard";
import { useFieldDataRefresh } from "../storage/FieldDataRefreshContext";
import { FarmersStackParamList } from "../navigation/types";
import { useTheme } from "../theme";
import { space } from "../theme/layout";
import { useRefreshControlProps } from "../hooks/useRefreshControlProps";
import { asArray, getVisitDisplayDateTime } from "../utils/format";
import { navigateFarmerMap } from "../navigation/navigateFarmerMap";
import { prefillFromFarmer } from "../utils/farmerPrefill";

type Props = NativeStackScreenProps<FarmersStackParamList, "FarmerDetail">;

type TabKey = "Overview" | "Lands" | "Visits" | "Activity";

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: "Overview", label: "Overview" },
  { key: "Lands", label: "Lands" },
  { key: "Visits", label: "Visits" },
  { key: "Activity", label: "Activity" }
];

export function FarmerDetailScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [fields, setFields] = useState<unknown[]>([]);
  const [visits, setVisits] = useState<unknown[]>([]);
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
      setVisits(asArray(visitData));
      setActivity(asArray(activityData));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load farmer.");
    } finally {
      if (!isRefresh) setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    load(false);
  }, [load]);

  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => visitTimestamp(b) - visitTimestamp(a));
  }, [visits]);

  const lastVisitedLabel = useMemo(() => {
    const latest = sortedVisits[0];
    if (!latest || typeof latest !== "object" || !visitTimestamp(latest)) return "Not visited yet";
    const r = latest as { visit_date?: string; visit_time?: string; created_at?: string; updated_at?: string };
    return getVisitDisplayDateTime(r);
  }, [sortedVisits]);

  const activeCropLabel = useMemo(() => {
    const latest = sortedVisits[0];
    if (!latest || typeof latest !== "object") return "Not recorded";
    const r = latest as Record<string, unknown>;
    const cropInfo = r.crop_info && typeof r.crop_info === "object" ? (r.crop_info as { name?: string }).name : null;
    if (cropInfo) return cropInfo;
    if (typeof r.crop === "string" && r.crop.trim() && !/^\d+$/.test(r.crop)) return r.crop;
    return "Not recorded";
  }, [sortedVisits]);

  function openAddVisit() {
    if (!farmer) return;
    if (!canRunWorkAction()) return;
    navigation.getParent()?.getParent()?.navigate("VisitFlow", {
      screen: "NewVisitFarmer",
      params: { prefill: prefillFromFarmer(farmer) }
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
      <View style={[styles.skeletonWrap, { backgroundColor: c.background }]}>
        <ListSkeleton rows={4} />
      </View>
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => load(false)} />;
  if (!farmer) return null;

  const place = [farmer.village_name || farmer.village, farmer.district_name || farmer.district].filter(Boolean).join(", ") || "Not provided";

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <AppHeader title={farmer.name || "Farmer"} subtitle={place} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.screen}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} {...refreshControlProps} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView>
          <PremiumCard elevated>
            <FarmerPhotoPicker
              farmer={farmer}
              compact
              onFarmerUpdated={(updated) => {
                setFarmer(updated);
                bumpAfterFarmerPhotoChange();
              }}
            />
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={[styles.title, { color: c.text }]}>{farmer.name || "Farmer"}</Text>
                <View style={styles.heroRow}>
                  <Ionicons name="call-outline" size={15} color={c.muted} />
                  <Text style={[styles.meta, { color: c.muted }]}>{farmer.phone?.trim() || "Not provided"}</Text>
                </View>
                <View style={styles.heroRow}>
                  <Ionicons name="leaf-outline" size={15} color={c.muted} />
                  <Text style={[styles.meta, { color: c.muted }]}>{farmer.crop_name || activeCropLabel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroActions}>
              <PrimaryButton title="View on map" onPress={openFarmerMap} variant="secondary" style={styles.heroBtn} />
              <PrimaryButton title="Revisit" onPress={openAddVisit} style={styles.heroBtn} />
            </View>
          </PremiumCard>
        </FadeInView>

        <FilterChips options={TAB_OPTIONS} value={activeTab} onChange={setActiveTab} />

        {activeTab === "Overview" ? (
          <>
            <PremiumCard elevated tint="soft">
              <Text style={[styles.sectionTitle, { color: c.text }]}>At a glance</Text>
              <InfoRow label="Last visited" value={lastVisitedLabel} />
              <InfoRow label="Latest crop" value={activeCropLabel} />
              <InfoRow
                label="Land area"
                value={String(farmer.land_area || farmer.total_land_area || "Not provided")}
              />
            </PremiumCard>
            <PremiumCard elevated>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Recent visits</Text>
              {sortedVisits.length === 0 ? (
                <Text style={[styles.emptyInline, { color: c.muted }]}>No visits yet. Tap Revisit to log your first field visit.</Text>
              ) : (
                sortedVisits.slice(0, 4).map((item, index) => (
                  <View key={index} style={[styles.visitRow, index > 0 && { borderTopColor: c.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 }]}>
                    <Text style={[styles.listTitle, { color: c.text }]}>{summarize(item)}</Text>
                    <Text style={[styles.listMeta, { color: c.muted }]}>{detailLine(item)}</Text>
                  </View>
                ))
              )}
            </PremiumCard>
          </>
        ) : null}

        {activeTab === "Lands" ? (
          <Panel>
            {fields.length === 0 ? (
              <EmptyState title="No land files" message="Plots linked to this farmer will appear here." illustration="map" />
            ) : (
              fields.map((item, index) => (
                <PremiumCard key={index} elevated>
                  <Text style={[styles.listTitle, { color: c.text }]}>{summarize(item)}</Text>
                  <Text style={[styles.listMeta, { color: c.muted }]}>{detailLine(item)}</Text>
                </PremiumCard>
              ))
            )}
          </Panel>
        ) : null}

        {activeTab === "Visits" ? (
          <Panel>
            <PrimaryButton title="Revisit" onPress={openAddVisit} variant="secondary" style={styles.panelAddBtn} />
            {sortedVisits.length === 0 ? (
              <EmptyState title="No visits" message="Start a new field visit for this farmer." illustration="visits" />
            ) : (
              sortedVisits.map((item, index) => (
                <PremiumCard key={index} elevated>
                  <Text style={[styles.listTitle, { color: c.text }]}>{summarize(item)}</Text>
                  <Text style={[styles.listMeta, { color: c.muted }]}>{detailLine(item)}</Text>
                </PremiumCard>
              ))
            )}
          </Panel>
        ) : null}

        {activeTab === "Activity" ? (
          <Panel>
            {activity.length === 0 ? (
              <EmptyState title="No activity" message="Recent touchpoints will display when available." illustration="generic" />
            ) : (
              activity.map((item, index) => (
                <PremiumCard key={index} elevated>
                  <Text style={[styles.listTitle, { color: c.text }]}>{summarize(item)}</Text>
                  <Text style={[styles.listMeta, { color: c.muted }]}>{detailLine(item)}</Text>
                </PremiumCard>
              ))
            )}
          </Panel>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "800", marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function visitDateIso(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  const d = r.created_at || r.date || r.recorded_at;
  return typeof d === "string" ? d : null;
}

function visitTimestamp(item: unknown) {
  const iso = visitDateIso(item);
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function summarize(item: unknown) {
  if (item === null || item === undefined) return "Visit";
  if (typeof item !== "object") return String(item);
  const r = item as Record<string, unknown>;
  const crop = r.crop_info && typeof r.crop_info === "object" ? (r.crop_info as Record<string, unknown>).name : null;
  return String(r.farmer_name || crop || r.name || r.field_name || r.plot_name || r.crop || r.activity_type || r.title || "Visit");
}

function detailLine(item: unknown) {
  if (!item || typeof item !== "object") return "";
  const r = item as Record<string, unknown>;
  const date = visitDateIso(item);
  if (date) return getVisitDisplayDateTime({ created_at: date, visit_date: typeof r.visit_date === "string" ? r.visit_date : null, visit_time: typeof r.visit_time === "string" ? r.visit_time : null });
  const bits = [r.area, r.acreage, r.village_name, r.notes].filter((x) => typeof x === "string" && String(x).trim());
  return bits.slice(0, 2).join(" · ") || " ";
}

const styles = StyleSheet.create({
  skeletonWrap: { flex: 1, padding: space.lg },
  screen: { gap: 14, padding: space.lg, paddingBottom: 32 },
  heroTop: { alignItems: "center", flexDirection: "row", gap: 14 },
  avatar: { alignItems: "center", borderRadius: 18, height: 64, justifyContent: "center", width: 64 },
  initial: { fontSize: 26, fontWeight: "900" },
  heroCopy: { flex: 1 },
  title: { fontSize: 20, fontWeight: "900" },
  heroRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 6 },
  meta: { flex: 1, fontSize: 14, lineHeight: 20 },
  heroActions: { flexDirection: "row", gap: 10, marginTop: space.lg },
  heroBtn: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 12 },
  infoRow: { marginBottom: 14 },
  panel: { gap: 10 },
  panelAddBtn: { marginBottom: space.sm },
  listTitle: { fontSize: 16, fontWeight: "800" },
  listMeta: { fontSize: 13, marginTop: 4 },
  visitRow: { paddingVertical: 4 },
  emptyInline: { fontSize: 14, lineHeight: 20 }
});
