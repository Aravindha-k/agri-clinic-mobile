import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import type { Visit } from "../../../src/api/visits";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { navigateFarmerMap } from "../../../src/navigation/navigateFarmerMap";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { getVisitDisplayDateTime } from "../../../src/utils/format";
import { prefillFromFarmer } from "../../../src/utils/farmerPrefill";
import { FarmerPhotoAvatar } from "../../components/farmers/FarmerPhotoAvatar";
import { EmptyState, GhostButton, PrimaryButton, SectionHeader, Skeleton, StatusChip } from "../../components/ui";
import { FadeInSection, entranceListStagger, entranceStagger } from "../../components/ui/FadeInSection";
import { ScreenEntranceShell } from "../../components/layout";
import {
  cropFromVisit,
  fetchMobileFarmerProfile,
  problemCategoryFromVisit,
  recommendationFromVisit,
  severityFromVisit,
  type CurrentCropCard,
  type FarmerField,
  type MobileFarmerProfile
} from "../../lib/farmerProfileApi";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const CROP_CARD_BG: Record<CurrentCropCard["tone"], string> = {
  blue: Colors.blueBg,
  green: Colors.greenBg,
  amber: Colors.amberBg
};

const CROP_CARD_TEXT: Record<CurrentCropCard["tone"], string> = {
  blue: Colors.blueText,
  green: Colors.greenText,
  amber: Colors.amberText
};

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statChipLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function KpiCell({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.kpiCell}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function CropCard({ crop }: { crop: CurrentCropCard }) {
  return (
    <View style={[styles.cropCard, { backgroundColor: CROP_CARD_BG[crop.tone] }]}>
      <Text style={[styles.cropName, { color: CROP_CARD_TEXT[crop.tone] }]} numberOfLines={1}>
        {crop.crop_name}
      </Text>
      <Text style={[styles.cropMeta, { color: CROP_CARD_TEXT[crop.tone] }]} numberOfLines={2}>
        {[crop.field_name, crop.stage].filter(Boolean).join(" · ") || "Active crop"}
      </Text>
    </View>
  );
}

function FieldAccordionItem({
  field,
  expanded,
  onToggle
}: {
  field: FarmerField;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.fieldCard}>
      <Pressable onPress={onToggle} style={styles.fieldHead}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.fieldName}>{field.land_name}</Text>
          <Text style={styles.fieldMeta}>
            {[field.land_size, field.soil_type, field.irrigation_type].filter(Boolean).join(" · ") ||
              "Details not recorded"}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.text3} />
      </Pressable>
      {expanded ? (
        <View style={styles.fieldCrops}>
          {field.crops.length === 0 ? (
            <Text style={styles.fieldEmpty}>No crops linked to this field.</Text>
          ) : (
            field.crops.map((crop, index) => (
              <View key={`${crop.crop_name}-${index}`} style={styles.fieldCropRow}>
                <Text style={styles.fieldCropName}>{crop.crop_name}</Text>
                <Text style={styles.fieldCropMeta}>
                  {[crop.field_name, crop.stage].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function TimelineItem({ visit, isLast }: { visit: Visit; isLast: boolean }) {
  const severity = severityFromVisit(visit);
  const crop = cropFromVisit(visit);
  const problem = problemCategoryFromVisit(visit);

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={styles.timelineDot} />
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={[styles.timelineCard, isLast && { marginBottom: 0 }]}>
        <Text style={styles.timelineDate}>{getVisitDisplayDateTime(visit)}</Text>
        <View style={styles.timelineMeta}>
          <StatusChip label={crop} variant="gray" />
          <StatusChip label={problem} variant="blue" />
          <StatusChip label={severity.label} variant={severity.variant} />
        </View>
      </View>
    </View>
  );
}

export default function FarmerProfileScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const farmerId = Number(route.params?.id);
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsetsCompat();
  const refreshControlProps = useRefreshControlProps();
  const { bumpAfterFarmerPhotoChange } = useFieldDataRefresh();

  const [profile, setProfile] = useState<MobileFarmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [showAllVisits, setShowAllVisits] = useState(false);

  const rootNav = navigation.getParent()?.getParent() ?? navigation.getParent();

  const load = useCallback(
    async (isRefresh = false) => {
      if (!Number.isFinite(farmerId) || farmerId <= 0) {
        setError("Invalid farmer.");
        setLoading(false);
        return;
      }
      try {
        setError("");
        const data = await fetchMobileFarmerProfile(farmerId);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load farmer profile.");
      } finally {
        if (!isRefresh) setLoading(false);
        setRefreshing(false);
      }
    },
    [farmerId]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const visitsPreview = useMemo(() => {
    if (!profile) return [];
    return showAllVisits ? profile.visits : profile.visits.slice(0, 5);
  }, [profile, showAllVisits]);

  const lastVisit = profile?.visits[0] ?? null;
  const lastVisitCrop = lastVisit ? cropFromVisit(lastVisit) : "";
  const lastVisitProblem = lastVisit ? problemCategoryFromVisit(lastVisit) : "";
  const lastVisitRecommendation = lastVisit ? recommendationFromVisit(lastVisit) : "";

  function toggleField(id: string) {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openOptionsMenu() {
    if (!profile) return;
    Alert.alert("Farmer options", profile.farmer.name || "Farmer", [
      {
        text: "Refresh profile",
        onPress: () => {
          setRefreshing(true);
          void load(true);
        }
      },
      {
        text: "View on map",
        onPress: () =>
          navigateFarmerMap(navigation, {
            farmerId: profile.farmer.id,
            farmerName: profile.farmer.name,
            village: String(profile.farmer.village_name || profile.farmer.village || ""),
            latitude: profile.farmer.latitude,
            longitude: profile.farmer.longitude
          })
      },
      { text: "Cancel", style: "cancel" }
    ]);
  }

  function openNewVisit() {
    if (!profile) return;
    void (async () => {
      const allowed = await requestGpsForFieldWork();
      if (!allowed) return;
      rootNav?.navigate("VisitFlow", {
        screen: "NewVisitFarmer",
        params: { prefill: prefillFromFarmer(profile.farmer), fastRevisit: true }
      });
    })();
  }

  function openCall() {
    const phone = profile?.farmer.phone?.trim();
    if (phone) void Linking.openURL(`tel:${phone}`);
  }

  function openMap() {
    if (!profile) return;
    navigateFarmerMap(navigation, {
      farmerId: profile.farmer.id,
      farmerName: profile.farmer.name,
      village: String(profile.farmer.village_name || profile.farmer.village || ""),
      latitude: profile.farmer.latitude,
      longitude: profile.farmer.longitude
    });
  }

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: safeTop }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.text1} />
          </Pressable>
          <Text style={styles.topTitle}>Farmer profile</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.loadingWrap}>
          <Skeleton width="100%" height={160} borderRadius={Radius.card} />
          <Skeleton width="100%" height={72} />
          <Skeleton width="100%" height={120} borderRadius={Radius.card} />
        </View>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.screen, { paddingTop: safeTop }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={Colors.text1} />
          </Pressable>
          <Text style={styles.topTitle}>Farmer profile</Text>
          <View style={styles.backBtn} />
        </View>
        <EmptyState
          icon="person-outline"
          title="Could not load farmer"
          subtitle={error || "Try again."}
          action="Retry"
          onAction={() => void load(false)}
        />
      </View>
    );
  }

  const { farmer } = profile;
  const phone = farmer.phone?.trim() || "—";

  return (
    <ScreenEntranceShell style={[styles.screen, { paddingTop: safeTop }]}>
      {(entranceTick) => (
        <>
      <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <Text style={styles.topTitle}>Farmer profile</Text>
        <Pressable onPress={openOptionsMenu} style={styles.backBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color={Colors.text1} />
        </Pressable>
      </View>
      </FadeInSection>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 96 + safeBottom }]}
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
      >
        <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)} variant="card">
        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <FarmerPhotoAvatar
              farmer={farmer}
              size={52}
              onFarmerUpdated={(updated) => {
                setProfile((prev) => (prev ? { ...prev, farmer: updated } : prev));
                bumpAfterFarmerPhotoChange();
              }}
            />
            <View style={styles.heroCopy}>
              <Text style={styles.heroName} numberOfLines={2}>
                {farmer.name || "Farmer"}
              </Text>
              {profile.farmer_code ? (
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{profile.farmer_code}</Text>
                </View>
              ) : null}
              <View style={styles.phoneRow}>
                <Text style={styles.phoneText}>{phone}</Text>
                {farmer.phone?.trim() ? (
                  <Pressable onPress={openCall} style={styles.callCircle}>
                    <Ionicons name="call" size={16} color={Colors.brand700} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.heroStats}>
            <StatChip label="Land area" value={profile.land_area || "—"} />
            <StatChip label="Irrigation" value={profile.irrigation_type || "—"} />
            <StatChip label="Soil type" value={profile.soil_type || "—"} />
          </View>
        </View>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(2)} variant="card">
        <View style={styles.kpiStrip}>
          <KpiCell value={profile.total_visits} label="Total visits" />
          <KpiCell value={profile.last_visit_label} label="Last visit" />
        </View>

        {lastVisit ? (
          <View style={styles.section}>
            <SectionHeader title="LAST VISIT" />
            <View style={styles.lastVisitCard}>
              {lastVisitCrop ? (
                <Text style={styles.lastVisitLine}>
                  <Text style={styles.lastVisitLabel}>Crop: </Text>
                  {lastVisitCrop}
                </Text>
              ) : null}
              {lastVisitProblem ? (
                <Text style={styles.lastVisitLine}>
                  <Text style={styles.lastVisitLabel}>Problem: </Text>
                  {lastVisitProblem}
                </Text>
              ) : null}
              {lastVisitRecommendation ? (
                <Text style={styles.lastVisitLine}>
                  <Text style={styles.lastVisitLabel}>Recommendation: </Text>
                  {lastVisitRecommendation}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(3)} variant="card">
        <View style={styles.section}>
          <SectionHeader title="CURRENT CROPS" />
          {profile.current_crops.length === 0 ? (
            <Text style={styles.emptyLine}>No active crops recorded.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropScroll}>
              {profile.current_crops.map((crop) => (
                <CropCard key={crop.id} crop={crop} />
              ))}
            </ScrollView>
          )}
        </View>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(4)} variant="card">
        <View style={styles.section}>
          <SectionHeader title="FIELDS & LAND" />
          {profile.fields.length === 0 ? (
            <Text style={styles.emptyLine}>No fields registered for this farmer.</Text>
          ) : (
            profile.fields.map((field, index) => (
              <FadeInSection
                key={field.id}
                replayKey={entranceTick}
                delay={entranceListStagger(4, index)}
                variant="card"
              >
                <FieldAccordionItem
                  field={field}
                  expanded={expandedFields.has(field.id)}
                  onToggle={() => toggleField(field.id)}
                />
              </FadeInSection>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="VISIT HISTORY"
            action={profile.visits.length > 5 ? (showAllVisits ? "Show less" : "View all") : undefined}
            onAction={() => setShowAllVisits((v) => !v)}
          />
          {profile.visits.length === 0 ? (
            <Text style={styles.emptyLine}>No visits logged yet.</Text>
          ) : (
            visitsPreview.map((visit, index) => (
              <FadeInSection
                key={visit.id}
                replayKey={entranceTick}
                delay={entranceListStagger(5, index)}
                variant="card"
              >
              <Pressable
                onPress={() =>
                  rootNav?.navigate("Main", {
                    screen: "Work",
                    params: { screen: "VisitDetail", params: { id: visit.id } }
                  })
                }
              >
                <TimelineItem visit={visit} isLast={index === visitsPreview.length - 1} />
              </Pressable>
              </FadeInSection>
            ))
          )}
        </View>
        </FadeInSection>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(safeBottom, 12) }]}>
        <GhostButton
          label="Call"
          onPress={openCall}
          icon={<Ionicons name="call-outline" size={16} color={Colors.text2} />}
          style={styles.bottomGhost}
        />
        <GhostButton
          label="Map"
          onPress={openMap}
          icon={<Ionicons name="map-outline" size={16} color={Colors.text2} />}
          style={styles.bottomGhost}
        />
        <PrimaryButton
          label="Start revisit →"
          onPress={openNewVisit}
          style={styles.bottomPrimary}
          icon={<Ionicons name="arrow-forward" size={16} color={Colors.surface} />}
        />
      </View>
        </>
      )}
    </ScreenEntranceShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingVertical: 10
  },
  backBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  topTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  scroll: {
    gap: 14
  },
  loadingWrap: {
    gap: 12,
    paddingHorizontal: Spacing.screen
  },
  heroCard: {
    backgroundColor: Colors.brand700,
    borderRadius: Radius.card,
    gap: 14,
    marginHorizontal: Spacing.screen,
    padding: 18
  },
  heroRow: {
    flexDirection: "row",
    gap: 12
  },
  heroCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  heroName: {
    color: Colors.surface,
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold
  },
  codeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  codeText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  phoneRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  phoneText: {
    color: Colors.brand100,
    flex: 1,
    fontSize: FontSize.md
  },
  callCircle: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  heroStats: {
    flexDirection: "row",
    gap: 8
  },
  statChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Radius.sm,
    flex: 1,
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  statChipValue: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  statChipLabel: {
    color: Colors.brand100,
    fontSize: FontSize.xs
  },
  kpiStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: Spacing.screen
  },
  kpiCell: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 10
  },
  kpiValue: {
    color: Colors.brand700,
    fontSize: FontSize.stat,
    fontWeight: FontWeight.bold
  },
  kpiLabel: {
    color: Colors.text4,
    fontSize: FontSize.xs
  },
  lastVisitCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  lastVisitLine: {
    color: Colors.text1,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  lastVisitLabel: {
    color: Colors.text4,
    fontWeight: FontWeight.semibold
  },
  section: {
    gap: 10,
    paddingHorizontal: Spacing.screen
  },
  cropScroll: {
    gap: 10,
    paddingRight: 4
  },
  cropCard: {
    borderRadius: Radius.lg,
    gap: 4,
    minWidth: 140,
    padding: 12
  },
  cropName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  cropMeta: {
    fontSize: FontSize.sm
  },
  fieldCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden"
  },
  fieldHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  fieldName: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  fieldMeta: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  fieldCrops: {
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    padding: 14,
    paddingTop: 10
  },
  fieldCropRow: {
    gap: 2
  },
  fieldCropName: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  fieldCropMeta: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  fieldEmpty: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10
  },
  timelineRail: {
    alignItems: "center",
    width: 16
  },
  timelineDot: {
    backgroundColor: Colors.green,
    borderRadius: 5,
    height: 10,
    marginTop: 6,
    width: 10
  },
  timelineLine: {
    backgroundColor: Colors.border2,
    flex: 1,
    marginTop: 4,
    width: 2
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    marginBottom: 10,
    padding: 12
  },
  timelineDate: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  timelineMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  emptyLine: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  bottomBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    left: 0,
    paddingHorizontal: Spacing.screen,
    paddingTop: 12,
    position: "absolute",
    right: 0
  },
  bottomGhost: {
    flex: 1
  },
  bottomPrimary: {
    flex: 2,
    height: 42
  }
});
