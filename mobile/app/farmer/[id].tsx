import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Farmer } from "../../../src/api/farmers";
import type { Visit } from "../../../src/api/visits";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { navigateFarmerMap } from "../../../src/navigation/navigateFarmerMap";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import { useFieldDataRefresh } from "../../../src/storage/FieldDataRefreshContext";
import { getVisitDisplayDateTime } from "../../../src/utils/format";
import { prefillFromFarmer } from "../../../src/utils/farmerPrefill";
import { formatTalukLabel } from "../../../src/utils/locationCascade";
import type { WorkStackParamList } from "../../../src/navigation/types";
import { ScreenErrorBoundary } from "../../../src/components/ScreenErrorBoundary";
import { qaLogNavParamsMissing, qaLogScreenOpen } from "../../../src/utils/qaLog";
import { FarmerPhotoAvatar } from "../../components/farmers/FarmerPhotoAvatar";
import { EmptyState, GhostButton, PrimaryButton, SectionHeader, StatusChip } from "../../components/ui";
import { FadeInSection, entranceListStagger, entranceStagger } from "../../components/ui/FadeInSection";
import { ScreenEntranceShell, StackScreenHeader } from "../../components/layout";
import { getCachedFarmers } from "../../lib/farmersCache";
import {
  readFarmerProfileCache,
  readFreshFarmerProfileCache
} from "../../lib/farmerProfileCache";
import {
  cropFromVisit,
  fetchMobileFarmerProfile,
  problemCategoryFromVisit,
  recommendationFromVisit,
  seedMobileFarmerProfile,
  severityFromVisit,
  type CurrentCropCard,
  type FarmerField,
  type MobileFarmerProfile
} from "../../lib/farmerProfileApi";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const VISITS_PREVIEW_COUNT = 5;
const VISITS_EXPAND_CAP = 15;

function initialProfileFromRoute(
  farmerId: number,
  prefill: WorkStackParamList["FarmerDetail"]["prefill"] | undefined
): MobileFarmerProfile | null {
  if (!Number.isFinite(farmerId) || farmerId <= 0) return null;
  const fresh = readFreshFarmerProfileCache(farmerId);
  if (fresh) return fresh;
  const cached = readFarmerProfileCache(farmerId);
  if (cached) return cached;
  const fromDirectory = getCachedFarmers().find((row) => Number(row.id) === farmerId);
  if (fromDirectory) return seedMobileFarmerProfile(fromDirectory);
  if (prefill) {
    const seeded: Farmer = {
      id: farmerId,
      name: prefill.name,
      phone: prefill.phone,
      village_name: prefill.village_name,
      photo_url: prefill.photo_url,
      profile_photo_url: prefill.profile_photo_url,
      latitude: prefill.latitude,
      longitude: prefill.longitude,
      land_area: prefill.land_area,
      total_visits: prefill.total_visits
    };
    return seedMobileFarmerProfile(seeded);
  }
  return null;
}

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
  const { t } = useI18n();
  const tone = crop.tone === "blue" || crop.tone === "green" || crop.tone === "amber" ? crop.tone : "green";
  return (
    <View style={[styles.cropCard, { backgroundColor: CROP_CARD_BG[tone] }]}>
      <Text style={[styles.cropName, { color: CROP_CARD_TEXT[tone] }]} numberOfLines={1}>
        {crop.crop_name || "Crop"}
      </Text>
      <Text style={[styles.cropMeta, { color: CROP_CARD_TEXT[tone] }]} numberOfLines={2}>
        {[crop.field_name, crop.stage].filter(Boolean).join(" · ") || t("farmerDetail.activeCrop")}
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
  const { t } = useI18n();
  return (
    <View style={styles.fieldCard}>
      <Pressable onPress={onToggle} style={styles.fieldHead}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.fieldName}>{field.land_name}</Text>
          <Text style={styles.fieldMeta}>
            {[field.land_size, field.soil_type, field.irrigation_type].filter(Boolean).join(" · ") ||
              t("farmerDetail.detailsNotRecorded")}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.text3} />
      </Pressable>
      {expanded ? (
        <View style={styles.fieldCrops}>
          {field.crops?.length === 0 ? (
            <Text style={styles.fieldEmpty}>{t("farmerDetail.noCropsOnField")}</Text>
          ) : (
            (field.crops ?? []).map((crop, index) => (
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
  if (!visit) return null;
  const severity = severityFromVisit(visit);
  const crop = cropFromVisit(visit) || "Crop";
  const problem = problemCategoryFromVisit(visit) || "General";

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
  return (
    <ScreenErrorBoundary screenName="FarmerDetail">
      <FarmerProfileScreenInner />
    </ScreenErrorBoundary>
  );
}

function FarmerProfileScreenInner() {
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<WorkStackParamList, "FarmerDetail">>();
  const rawId = route.params?.id;
  const farmerId = typeof rawId === "number" ? rawId : Number(rawId);
  const routePrefill = route.params?.prefill;

  useEffect(() => {
    qaLogScreenOpen("FarmerDetail", Number.isFinite(farmerId) ? `id=${farmerId}` : "invalid_id");
    if (!Number.isFinite(farmerId) || farmerId <= 0) {
      qaLogNavParamsMissing("FarmerDetail", "id");
    }
  }, [farmerId]);
  const { bottom: safeBottom } = useSafeAreaInsetsCompat();
  const refreshControlProps = useRefreshControlProps();
  const { bumpAfterFarmerPhotoChange } = useFieldDataRefresh();

  const [profile, setProfile] = useState<MobileFarmerProfile | null>(() =>
    initialProfileFromRoute(farmerId, routePrefill)
  );
  const [loading, setLoading] = useState(() => !initialProfileFromRoute(farmerId, routePrefill));
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [showAllVisits, setShowAllVisits] = useState(false);

  const rootNav = navigation.getParent()?.getParent() ?? navigation.getParent();

  const load = useCallback(
    async (isRefresh = false) => {
      if (!Number.isFinite(farmerId) || farmerId <= 0) {
        setError(t("farmerDetail.invalidFarmer"));
        setLoading(false);
        setSyncing(false);
        return;
      }
      try {
        setError("");
        if (!isRefresh) setSyncing(true);
        const data = await fetchMobileFarmerProfile(farmerId);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load farmer profile.");
      } finally {
        setLoading(false);
        setSyncing(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [farmerId, t]
  );

  useEffect(() => {
    const seeded = initialProfileFromRoute(farmerId, route.params?.prefill);
    setProfile(seeded);
    setLoading(!seeded);
    setError("");
    setShowAllVisits(false);
    void load(false);
    // Prefill is only used for first paint seed; farmerId drives reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid object-identity refetch loops
  }, [farmerId, load]);

  const visitsPreview = useMemo(() => {
    if (!profile) return [];
    if (showAllVisits) return profile.visits.slice(0, VISITS_EXPAND_CAP);
    return profile.visits.slice(0, VISITS_PREVIEW_COUNT);
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
    Alert.alert(t("farmerDetail.optionsTitle"), profile.farmer.name || t("farmerDetail.title"), [
      {
        text: t("farmerDetail.refreshProfile"),
        onPress: () => {
          setRefreshing(true);
          void load(true);
        }
      },
      {
        text: t("farmerDetail.viewOnMap"),
        onPress: () =>
          navigateFarmerMap(navigation, {
            farmerId: profile.farmer.id,
            farmerName: profile.farmer.name,
            village: String(profile.farmer.village_name || profile.farmer.village || ""),
            latitude: profile.farmer.latitude,
            longitude: profile.farmer.longitude
          })
      },
      { text: t("common.cancel"), style: "cancel" }
    ]);
  }

  function openNewVisit() {
    if (!profile) return;
    void (async () => {
      const allowed = await requestGpsForFieldWork();
      if (!allowed) return;
      rootNav?.navigate("VisitFlow", {
        screen: "NewVisitFarmer",
        params: { fresh: true, prefill: prefillFromFarmer(profile.farmer) }
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

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <StackScreenHeader
          title={t("farmerDetail.title")}
          onBack={() => navigation.goBack()}
          includeSafeTop={false}
        />
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={Colors.brand700} />
          <Text style={styles.inlineLoadingText}>{t("common.loading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if ((error && !profile) || !profile) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <StackScreenHeader
          title={t("farmerDetail.title")}
          onBack={() => navigation.goBack()}
          includeSafeTop={false}
        />
        <EmptyState
          icon="person-outline"
          title={t("farmerDetail.loadError")}
          subtitle={error || t("farmerDetail.loadErrorHint")}
          action={t("common.retry")}
          onAction={() => void load(false)}
        />
      </SafeAreaView>
    );
  }

  const { farmer } = profile;
  const phone = farmer.phone?.trim() || "—";

  return (
    <ScreenEntranceShell style={styles.screen} withBrandHeader={false} deferCanvas>
      {(entranceTick) => (
        <>
      <StackScreenHeader
        title={t("farmerDetail.title")}
        subtitle={profile.farmer.name || undefined}
        onBack={() => navigation.goBack()}
        includeSafeTop
        right={
          <View style={styles.headerRight}>
            {syncing ? <ActivityIndicator size="small" color={Colors.brand700} /> : null}
            <Pressable onPress={openOptionsMenu} style={styles.menuBtn} hitSlop={8}>
              <Ionicons name="ellipsis-vertical" size={20} color={Colors.text2} />
            </Pressable>
          </View>
        }
      />

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
              <Text style={styles.placeText} numberOfLines={3}>
                {[
                  farmer.village_name || farmer.village,
                  `${t("farmerDetail.taluk")}: ${formatTalukLabel(farmer, t("farmerDetail.notAssigned"))}`,
                  farmer.district_name || farmer.district
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <StatChip label={t("farmerDetail.landArea")} value={profile.land_area || "—"} />
            <StatChip label={t("farmerDetail.irrigation")} value={profile.irrigation_type || "—"} />
            <StatChip label={t("farmerDetail.soilType")} value={profile.soil_type || "—"} />
          </View>
        </View>
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(2)} variant="card">
        <View style={styles.kpiStrip}>
          <KpiCell value={profile.total_visits} label={t("farmerDetail.totalVisits")} />
          <KpiCell value={profile.last_visit_label} label={t("farmerDetail.lastVisit")} />
        </View>

        {lastVisit ? (
          <View style={styles.section}>
            <SectionHeader title={t("farmerDetail.lastVisitSection").toUpperCase()} />
            <View style={styles.lastVisitCard}>
              {lastVisitCrop ? (
                <Text style={styles.lastVisitLine}>
                  <Text style={styles.lastVisitLabel}>{t("farmerDetail.cropLabel")}: </Text>
                  {lastVisitCrop}
                </Text>
              ) : null}
              {lastVisitProblem ? (
                <Text style={styles.lastVisitLine}>
                  <Text style={styles.lastVisitLabel}>{t("farmerDetail.problemLabel")}: </Text>
                  {lastVisitProblem}
                </Text>
              ) : null}
              {lastVisitRecommendation ? (
                <Text style={styles.lastVisitLine}>
                  <Text style={styles.lastVisitLabel}>{t("farmerDetail.recommendationLabel")}: </Text>
                  {lastVisitRecommendation}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}
        </FadeInSection>

        <FadeInSection replayKey={entranceTick} delay={entranceStagger(3)} variant="card">
        <View style={styles.section}>
          <SectionHeader title={t("farmerDetail.currentCrops").toUpperCase()} />
          {profile.current_crops.length === 0 ? (
            <Text style={styles.emptyLine}>{t("farmerDetail.noActiveCrops")}</Text>
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
          <SectionHeader title={t("farmerDetail.fieldsAndLand").toUpperCase()} />
          {profile.fields.length === 0 ? (
            <Text style={styles.emptyLine}>{t("farmerDetail.noFields")}</Text>
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
            title={t("farmerDetail.visitHistory").toUpperCase()}
            action={profile.visits.length > 5 ? (showAllVisits ? t("farmerDetail.showLess") : t("farmerDetail.viewAll")) : undefined}
            onAction={() => setShowAllVisits((v) => !v)}
          />
          {profile.visits.length === 0 ? (
            <Text style={styles.emptyLine}>{t("farmerDetail.noVisits")}</Text>
          ) : (
            visitsPreview.map((visit, index) => (
              <FadeInSection
                key={visit.id}
                replayKey={entranceTick}
                delay={entranceListStagger(5, index)}
                variant="card"
              >
              <Pressable
                onPress={() => {
                  const visitId = Number(visit?.id);
                  if (!Number.isFinite(visitId) || visitId <= 0) return;
                  // Stay on Work stack so back returns to farmer detail / Work list.
                  navigation.push("VisitDetail", { id: visitId });
                }}
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
          label={t("farmerDetail.call")}
          onPress={openCall}
          icon={<Ionicons name="call-outline" size={16} color={Colors.text2} />}
          style={styles.bottomGhost}
        />
        <GhostButton
          label={t("farmerDetail.map")}
          onPress={openMap}
          icon={<Ionicons name="map-outline" size={16} color={Colors.text2} />}
          style={styles.bottomGhost}
        />
        <PrimaryButton
          label={`${t("farmerDetail.startRevisit")} →`}
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
  headerRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  inlineLoading: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.sm,
    justifyContent: "center",
    paddingHorizontal: Spacing.screen
  },
  inlineLoadingText: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  menuBtn: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingVertical: 10
  },
  heroNav: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%"
  },
  heroNavBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  heroNavTitle: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: "center"
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
    backgroundColor: Colors.onPrimaryGlass,
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
  placeText: {
    color: Colors.brand100,
    fontSize: FontSize.sm,
    marginTop: 4
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
    backgroundColor: Colors.onPrimaryGlass,
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
    flex: 2
  }
});
