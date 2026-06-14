import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { Farmer } from "../../../src/api/farmers";
import { getOptionLabel } from "../../../src/api/masters";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useConnectivityOnline } from "../../../src/hooks/useConnectivityOnline";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { loadRevisitPrefill } from "../../../src/utils/farmerPrefill";
import { FarmerPickCard } from "../../components/visit/FarmerPickCard";
import { MasterSelectSheet, type MasterSelectSheetRef } from "../../components/visit/MasterSelectSheet";
import { StepIndicator } from "../../components/visit/StepIndicator";
import { SearchBar, StatusChip } from "../../components/ui";
import { getCachedFarmers } from "../../lib/farmersCache";
import { fetchMobileFarmersPage, type MobileFarmer } from "../../lib/farmersApi";
import { farmerVisitCount, offlineFarmerMatchesSearch } from "../../lib/farmerStatus";
import { pushRecentFarmer, readRecentFarmers } from "../../lib/recentFarmers";
import {
  buildVillageQuickFilterNames,
  enrichFarmerFromPool,
  farmerMatchesVillageName
} from "../../lib/workQueue";
import { useVisitFormStore } from "../../store/visitFormStore";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

const SEARCH_DEBOUNCE_MS = 300;
const POOL_PAGE_SIZE = 100;

type Props = {
  onClose: () => void;
};

type FarmerPath = "none" | "existing" | "new";

function PathChoiceCard({
  icon,
  title,
  subtitle,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.pathCard}>
      <View style={styles.pathIconWrap}>
        <Ionicons name={icon} size={24} color={Colors.brand700} />
      </View>
      <View style={styles.pathCopy}>
        <Text style={styles.pathTitle}>{title}</Text>
        <Text style={styles.pathSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.text3} />
    </Pressable>
  );
}

function gpsLabel(accuracy: number | null | undefined, t: (k: string) => string): string {
  if (accuracy == null) return t("visitFlow.gpsLoading");
  return `${Math.round(accuracy)}m`;
}

function gpsDotColor(accuracy: number | null | undefined): string {
  if (accuracy == null) return Colors.amber;
  return accuracy <= 25 ? Colors.green : Colors.amber;
}

function renderPickRows(
  farmers: MobileFarmer[],
  onSelect: (farmer: MobileFarmer) => void
) {
  return farmers.map((farmer) => (
    <FarmerPickCard key={farmer.id} farmer={farmer} onPress={() => onSelect(farmer)} />
  ));
}

export default function VisitCreateStep({ onClose }: Props) {
  const { t } = useI18n();
  const online = useConnectivityOnline();
  const { districts, villages } = useMasterData();
  const applyRevisitPrefill = useVisitFormStore((s) => s.applyRevisitPrefill);
  const setFarmer = useVisitFormStore((s) => s.setFarmer);
  const setNewFarmer = useVisitFormStore((s) => s.setNewFarmer);
  const clearNewFarmer = useVisitFormStore((s) => s.clearNewFarmer);
  const setGpsCoords = useVisitFormStore((s) => s.setGpsCoords);
  const setStep = useVisitFormStore((s) => s.setStep);
  const setVisitKind = useVisitFormStore((s) => s.setVisitKind);
  const newFarmer = useVisitFormStore((s) => s.newFarmer);
  const gpsCoords = useVisitFormStore((s) => s.gpsCoords);
  const hasFormData = useVisitFormStore((s) => s.hasFormData);

  const [farmerPath, setFarmerPath] = useState<FarmerPath>("none");
  const [recentFarmers, setRecentFarmers] = useState<Farmer[]>([]);
  const [farmerPool, setFarmerPool] = useState<MobileFarmer[]>(() => getCachedFarmers() as MobileFarmer[]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MobileFarmer[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(gpsCoords?.accuracy ?? null);
  const [selectingFarmer, setSelectingFarmer] = useState(false);
  const [newFarmerErrors, setNewFarmerErrors] = useState<Record<string, string>>({});

  const districtSheetRef = useRef<MasterSelectSheetRef>(null);
  const villageSheetRef = useRef<MasterSelectSheetRef>(null);
  const searchRequestId = useRef(0);
  const poolRequestId = useRef(0);

  const draft = newFarmer ?? { name: "", phone: "", district_id: "", village_id: "" };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void readRecentFarmers().then(setRecentFarmers);
  }, []);

  const loadFarmerPool = useCallback(async () => {
    const requestId = ++poolRequestId.current;
    const cached = getCachedFarmers() as MobileFarmer[];

    if (cached.length > 0) {
      const filtered = selectedVillage
        ? cached.filter((farmer) => farmerMatchesVillageName(farmer, selectedVillage))
        : cached;
      if (requestId === poolRequestId.current) {
        setFarmerPool(filtered);
      }
      return;
    }

    if (!online) {
      if (requestId === poolRequestId.current) {
        setFarmerPool([]);
      }
      return;
    }

    setPoolLoading(true);
    try {
      const page = await fetchMobileFarmersPage({
        page: 1,
        pageSize: POOL_PAGE_SIZE,
        village: selectedVillage || undefined
      });
      if (requestId === poolRequestId.current) {
        setFarmerPool(page.results as MobileFarmer[]);
      }
    } catch {
      if (requestId === poolRequestId.current) {
        setFarmerPool([]);
      }
    } finally {
      if (requestId === poolRequestId.current) {
        setPoolLoading(false);
      }
    }
  }, [online, selectedVillage]);

  useEffect(() => {
    void loadFarmerPool();
  }, [loadFarmerPool]);

  const captureGps = useCallback(async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? null
      };
      setGpsCoords(coords);
      setGpsAccuracy(coords.accuracy);
    } catch {
      // silent background capture
    }
  }, [setGpsCoords]);

  useEffect(() => {
    void captureGps();
    const interval = setInterval(() => void captureGps(), 30_000);
    return () => clearInterval(interval);
  }, [captureGps]);

  useEffect(() => {
    const id = ++searchRequestId.current;
    if (!debouncedQuery) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    void (async () => {
      try {
        if (!online) {
          const cached = getCachedFarmers() as MobileFarmer[];
          const filtered = cached.filter((farmer) => offlineFarmerMatchesSearch(farmer, debouncedQuery));
          if (id === searchRequestId.current) setSearchResults(filtered.slice(0, 20));
          return;
        }
        const page = await fetchMobileFarmersPage({
          search: debouncedQuery,
          pageSize: 20,
          village: selectedVillage || undefined
        });
        if (id === searchRequestId.current) {
          setSearchResults(page.results as MobileFarmer[]);
        }
      } catch {
        if (id === searchRequestId.current) {
          const cached = getCachedFarmers() as MobileFarmer[];
          setSearchResults(
            cached.filter((farmer) => offlineFarmerMatchesSearch(farmer, debouncedQuery)).slice(0, 20)
          );
        }
      } finally {
        if (id === searchRequestId.current) setSearching(false);
      }
    })();
  }, [debouncedQuery, online, selectedVillage]);


  const villageQuickFilters = useMemo(
    () => buildVillageQuickFilterNames(farmerPool, recentFarmers),
    [farmerPool, recentFarmers]
  );

  const enrichedRecentFarmers = useMemo(
    () => recentFarmers.map((farmer) => enrichFarmerFromPool(farmer, farmerPool)),
    [farmerPool, recentFarmers]
  );

  const districtItems = useMemo(
    () =>
      districts.map((d) => ({
        id: String(d.id),
        title: getOptionLabel(d),
        subtitle: d.name_ta || undefined
      })),
    [districts]
  );

  const villageItems = useMemo(
    () =>
      villages
        .filter((v) => !draft.district_id || String(v.district) === draft.district_id)
        .map((v) => ({
          id: String(v.id),
          title: getOptionLabel(v),
          subtitle: v.district_name || undefined
        })),
    [draft.district_id, villages]
  );

  const selectedDistrictLabel = districtItems.find((d) => d.id === draft.district_id)?.title || t("visitFlow.selectDistrict");
  const selectedVillageLabel = villageItems.find((v) => v.id === draft.village_id)?.title || t("visitFlow.selectVillage");

  const showWorkQueue = debouncedQuery.length === 0;
  const showSearchResults = debouncedQuery.length > 0;

  function confirmClose() {
    if (!hasFormData()) {
      onClose();
      return;
    }
    Alert.alert(t("visitFlow.discardVisit"), t("visitFlow.discardVisitBody"), [
      { text: t("visitFlow.keepEditing"), style: "cancel" },
      { text: t("visitFlow.discard"), style: "destructive", onPress: onClose }
    ]);
  }

  async function selectFarmer(farmer: MobileFarmer) {
    if (selectingFarmer) return;
    setSelectingFarmer(true);
    clearNewFarmer();

    try {
      await pushRecentFarmer(farmer);
      setRecentFarmers(await readRecentFarmers());

      const hasVisitHistory = farmer.id != null && farmerVisitCount(farmer) > 0;
      if (hasVisitHistory) {
        const loaded = await loadRevisitPrefill(farmer, { districts, villages });
        applyRevisitPrefill(loaded);
        setVisitKind("revisit");
        setStep(2);
        return;
      }

      setFarmer(farmer);
      setVisitKind("first");
      setStep(2);
    } catch {
      setFarmer(farmer);
      setVisitKind("first");
      setStep(2);
    } finally {
      setSelectingFarmer(false);
    }
  }

  function continueNewFarmer() {
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    const errors: Record<string, string> = {};

    if (!name) errors.name = t("visitFlow.errName");
    if (!/^\d{10}$/.test(phone)) errors.phone = t("visitFlow.errPhone");
    if (!draft.district_id) errors.district_id = t("visitFlow.errDistrict");
    if (!draft.village_id) errors.village_id = t("visitFlow.errVillage");

    if (Object.keys(errors).length > 0) {
      setNewFarmerErrors(errors);
      return;
    }

    setNewFarmerErrors({});
    setNewFarmer({ name, phone, district_id: draft.district_id, village_id: draft.village_id });
    setFarmer(null);
    setVisitKind("first");
    setStep(2);
  }

  function resetFarmerPath() {
    setFarmerPath("none");
    setQuery("");
    setNewFarmerErrors({});
  }

  function toggleVillageFilter(villageName: string) {
    setSelectedVillage((current) => (current === villageName ? null : villageName));
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={confirmClose} style={styles.iconBtn}>
          <Ionicons name="close" size={18} color={Colors.text1} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{t("visitFlow.newVisit")}</Text>
          <Text style={styles.headerSub}>
            {farmerPath === "none" ? t("visitFlow.whoIsVisitFor") : t("visitFlow.step1Farmer")}
          </Text>
        </View>
        <View style={styles.gpsPill}>
          <View style={[styles.gpsDot, { backgroundColor: gpsDotColor(gpsAccuracy) }]} />
          <Text style={styles.gpsText}>{gpsLabel(gpsAccuracy, t)}</Text>
        </View>
      </View>

      <View style={styles.stepWrap}>
        <StepIndicator step={1} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {farmerPath === "none" ? (
          <View style={styles.pathList}>
            <PathChoiceCard
              icon="people-outline"
              title={t("visitFlow.existingFarmer")}
              subtitle={t("visitFlow.existingFarmerSub")}
              onPress={() => setFarmerPath("existing")}
            />
            <PathChoiceCard
              icon="person-add-outline"
              title={t("visitFlow.newFarmer")}
              subtitle={t("visitFlow.newFarmerSub")}
              onPress={() => setFarmerPath("new")}
            />
          </View>
        ) : null}

        {farmerPath !== "none" ? (
          <Pressable onPress={resetFarmerPath} style={styles.changePathBtn}>
            <Ionicons name="arrow-back" size={16} color={Colors.brand700} />
            <Text style={styles.changePathText}>{t("visitFlow.changeVisitType")}</Text>
          </Pressable>
        ) : null}

        {farmerPath === "existing" ? (
          <>
            {showWorkQueue ? (
              <>
                <Text style={styles.sectionLabel}>{t("visitFlow.recentFarmers")}</Text>
                <View style={styles.cardList}>
                  {enrichedRecentFarmers.length === 0 ? (
                    <Text style={styles.emptyHint}>{t("visitFlow.noRecentFarmers")}</Text>
                  ) : (
                    renderPickRows(enrichedRecentFarmers, (farmer) => void selectFarmer(farmer))
                  )}
                </View>

                {villageQuickFilters.length > 0 ? (
                  <>
                    <Text style={styles.sectionLabel}>{t("visitFlow.villageQuickFilters")}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.villageRow}>
                      {villageQuickFilters.map((villageName) => {
                        const active = selectedVillage === villageName;
                        return (
                          <Pressable key={villageName} onPress={() => toggleVillageFilter(villageName)}>
                            <StatusChip label={villageName} variant={active ? "blue" : "gray"} />
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    {selectedVillage ? (
                      <Text style={styles.filterHint}>{t("visitFlow.showingFarmersIn", { village: selectedVillage })}</Text>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            <Text style={styles.sectionLabel}>{t("visitFlow.searchFarmer")}</Text>
            <SearchBar value={query} onChangeText={setQuery} placeholder={t("visitFlow.searchFarmerPlaceholder")} />

            {showSearchResults ? (
              <View style={styles.cardList}>
                {searching ? <Text style={styles.emptyHint}>{t("visitFlow.searching")}</Text> : null}
                {!searching && searchResults.length === 0 ? (
                  <Text style={styles.emptyHint}>{t("visitFlow.noFarmersMatch")}</Text>
                ) : null}
                {searchResults.map((farmer) => (
                  <FarmerPickCard
                    key={`search-${farmer.id}`}
                    farmer={farmer}
                    onPress={() => void selectFarmer(farmer)}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {farmerPath === "new" ? (
          <View style={styles.inlineForm}>
            <Text style={styles.sectionLabel}>{t("visitFlow.registerNewFarmer")}</Text>

            <Text style={styles.inputLabel}>{t("visitFlow.fullName")}</Text>
            <TextInput
              value={draft.name}
              onChangeText={(text) => {
                setNewFarmer({ name: text });
                if (newFarmerErrors.name) setNewFarmerErrors((e) => ({ ...e, name: "" }));
              }}
              placeholder={t("visitFlow.farmerNamePlaceholder")}
              placeholderTextColor={Colors.text4}
              style={styles.input}
            />
            {newFarmerErrors.name ? <Text style={styles.fieldError}>{newFarmerErrors.name}</Text> : null}

            <Text style={styles.inputLabel}>{t("visitFlow.mobile")}</Text>
            <TextInput
              value={draft.phone}
              onChangeText={(text) => {
                setNewFarmer({ phone: text.replace(/\D/g, "").slice(0, 10) });
                if (newFarmerErrors.phone) setNewFarmerErrors((e) => ({ ...e, phone: "" }));
              }}
              placeholder={t("visitFlow.mobilePlaceholder")}
              placeholderTextColor={Colors.text4}
              keyboardType="number-pad"
              style={styles.input}
            />
            {newFarmerErrors.phone ? <Text style={styles.fieldError}>{newFarmerErrors.phone}</Text> : null}

                <Text style={styles.inputLabel}>{t("visitFlow.district")}</Text>
                <Pressable
                  onPress={() => districtSheetRef.current?.open()}
                  style={[styles.selectBtn, draft.district_id && styles.selectBtnFilled]}
                >
                  <Text style={[styles.selectBtnText, !draft.district_id && styles.selectBtnPlaceholder]}>
                    {selectedDistrictLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.text3} />
                </Pressable>
            {newFarmerErrors.district_id ? (
              <Text style={styles.fieldError}>{newFarmerErrors.district_id}</Text>
            ) : null}

            <Text style={styles.inputLabel}>{t("visitFlow.village")}</Text>
                <Pressable
                  onPress={() => villageSheetRef.current?.open()}
                  style={[
                    styles.selectBtn,
                    !draft.district_id && styles.selectBtnDisabled,
                    draft.village_id && styles.selectBtnFilled
                  ]}
                  disabled={!draft.district_id}
                >
                  <Text style={[styles.selectBtnText, !draft.village_id && styles.selectBtnPlaceholder]}>
                    {selectedVillageLabel}
                  </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.text3} />
            </Pressable>
            {newFarmerErrors.village_id ? (
              <Text style={styles.fieldError}>{newFarmerErrors.village_id}</Text>
            ) : null}

            <Pressable onPress={continueNewFarmer} style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>{t("visitFlow.continueNewFarmer")}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <MasterSelectSheet
        ref={districtSheetRef}
        title={t("visitFlow.selectDistrict")}
        items={districtItems}
        onSelect={(item) => setNewFarmer({ district_id: item.id, village_id: "" })}
      />
      <MasterSelectSheet
        ref={villageSheetRef}
        title={t("visitFlow.selectVillage")}
        items={villageItems}
        onSelect={(item) => setNewFarmer({ village_id: item.id })}
      />
    </View>
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: Spacing.screen,
    paddingTop: 8,
    paddingBottom: 10
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  headerTitle: {
    color: Colors.text1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold
  },
  headerSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  gpsPill: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  gpsDot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  gpsText: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  stepWrap: {
    paddingHorizontal: Spacing.screen,
    paddingBottom: 12
  },
  scroll: {
    gap: 12,
    paddingBottom: 32,
    paddingHorizontal: Spacing.screen
  },
  sectionLabel: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.04 * FontSize.sm
  },
  cardList: {
    gap: 8
  },
  emptyHint: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  villageRow: {
    gap: 8,
    paddingVertical: 2
  },
  filterHint: {
    color: Colors.text4,
    fontSize: FontSize.xs,
    marginTop: -4
  },
  pathList: {
    gap: 12,
    marginTop: 8
  },
  pathCard: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 18
  },
  pathIconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  pathCopy: {
    flex: 1,
    gap: 4
  },
  pathTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  pathSub: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  changePathBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4
  },
  changePathText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  fieldError: {
    color: Colors.redText,
    fontSize: FontSize.sm,
    marginTop: -2
  },
  newFarmerCard: {
    alignItems: "center",
    borderColor: Colors.border2,
    borderRadius: Radius.lg,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  newFarmerCardOpen: {
    borderColor: Colors.brand300,
    borderStyle: "solid"
  },
  newFarmerIcon: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.md,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  newFarmerTitle: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold
  },
  newFarmerSub: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    marginTop: 2
  },
  inlineForm: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 8,
    marginTop: -4,
    padding: 14
  },
  inputLabel: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: 4
  },
  input: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    color: Colors.text1,
    fontSize: FontSize.md,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  selectBtn: {
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  selectBtnDisabled: {
    opacity: 0.55
  },
  selectBtnText: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  },
  selectBtnPlaceholder: {
    color: Colors.text4,
    fontWeight: FontWeight.regular
  },
  selectBtnFilled: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand700
  },
  continueBtn: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.lg,
    marginTop: 8,
    paddingVertical: 12
  },
  continueBtnText: {
    color: Colors.surface,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  }
});

/** Step 2 — Crop & problem selection (same visit create module). */
export { VisitCreateStep2 } from "./create-step2";
/** Step 3 — Evidence, advice & submit (same visit create module). */
export { VisitCreateStep3 } from "./create-step3";
