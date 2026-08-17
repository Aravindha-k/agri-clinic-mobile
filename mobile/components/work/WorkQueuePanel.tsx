import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo, useRef, type ReactElement, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { LAN_OFFLINE_BANNER_MESSAGE } from "../../lib/api";
import { useRefreshControlProps } from "../../../src/hooks/useRefreshControlProps";
import { useTabBarBottomInset } from "../../../src/hooks/useTabBarBottomInset";
import { navigateFarmerMap } from "../../../src/navigation/navigateFarmerMap";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { useI18n } from "../../../src/i18n/I18nContext";
import { prefillFromFarmer } from "../../../src/utils/farmerPrefill";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import { FarmerDirectoryCard } from "../farmers/FarmerDirectoryCard";
import { VillageFilterSheet, type VillageFilterSheetRef } from "../farmers/VillageFilterSheet";
import { FlatProgressBar } from "../ui/FlatProgressBar";
import { ListStateView } from "../ui/ListStateView";
import { InlineSeedLoader } from "../layout/InlineSeedLoader";
import { ScreenLoader } from "../layout/ScreenLoader";
import {
  FadeInSection,
  entranceListStagger,
  entranceStagger
} from "../ui/FadeInSection";
import { useFarmersDirectory, type FarmerWorkQueueRow } from "../../hooks/useFarmersDirectory";
import { WORK_SECTION_I18N, type FarmerWorkSectionId } from "../../lib/workQueue";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";
import { BRAND_COLORS } from "../../../src/config/brand";
import { DS } from "../../../src/theme/globalStyles";
import { WorkQueueSectionHeader } from "./WorkQueueSectionHeader";

type Props = {
  entranceTick?: number | string;
  entranceStep?: number;
  active?: boolean;
};

const MAX_ROW_ENTRANCE = 6;

export function WorkQueuePanel({ entranceTick, entranceStep = 2 }: Props) {
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent()?.getParent();
  const { villages } = useMasterData();
  const tabInset = useTabBarBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const villageSheetRef = useRef<VillageFilterSheetRef>(null);

  const sectionTitle = useCallback(
    (sectionId: FarmerWorkSectionId, count: number) =>
      `${t(WORK_SECTION_I18N[sectionId])} (${count})`,
    [t]
  );

  const emptyMessage = useCallback(
    (sectionId: FarmerWorkSectionId) => {
      if (sectionId === "recently_visited") return t("work.emptyRecentlyVisited");
      return null;
    },
    [t]
  );

  const directory = useFarmersDirectory(sectionTitle, emptyMessage);

  useFocusEffect(
    useCallback(() => {
      directory.refreshLastSyncedLabel();
    }, [directory.refreshLastSyncedLabel])
  );

  const syncBtnLabel = directory.syncCompleteMessage
    ? directory.syncCompleteMessage
    : directory.syncingAll && directory.syncProgress
      ? `${directory.syncProgress.current}/${directory.syncProgress.total}`
      : t("farmers.syncAll");

  const keyExtractor = useCallback((item: FarmerWorkQueueRow) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: FarmerWorkQueueRow; index: number }) => {
      const shouldAnimate = Boolean(entranceTick) && index < MAX_ROW_ENTRANCE;
      const wrap = (node: ReactNode, asCard = false): ReactElement => {
        if (!shouldAnimate) return <>{node}</>;
        return (
          <FadeInSection
            replayKey={entranceTick}
            delay={entranceListStagger(entranceStep + 1, index)}
            variant={asCard ? "card" : "section"}
          >
            {node}
          </FadeInSection>
        );
      };

      if (item.type === "section") {
        return wrap(
          <WorkQueueSectionHeader
            title={t(WORK_SECTION_I18N[item.sectionId])}
            count={item.count}
            first={index === 0}
            collapsible={item.collapsible}
            collapsed={item.collapsed}
            onToggle={
              item.collapsible ? () => directory.toggleSection(item.sectionId) : undefined
            }
          />
        );
      }

      if (item.type === "empty") {
        return wrap(
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>{item.message}</Text>
          </View>
        );
      }

      const farmer = item.farmer;
      return wrap(
        <FarmerDirectoryCard
          farmer={farmer}
          workflow={item.workflow}
          onPress={() => {
            const id = Number(farmer?.id);
            if (!Number.isFinite(id) || id <= 0) return;
            navigation.push("FarmerDetail", {
              id,
              prefill: {
                name: farmer.name,
                phone: farmer.phone,
                village_name: String(farmer.village_name || farmer.village || ""),
                photo_url: farmer.photo_url,
                profile_photo_url: farmer.profile_photo_url,
                latitude: farmer.latitude,
                longitude: farmer.longitude,
                land_area: farmer.land_area ?? farmer.total_land_area,
                total_visits: farmer.total_visits ?? farmer.visit_count
              }
            });
          }}
          onMap={() =>
            navigateFarmerMap(navigation, {
              farmerId: farmer.id,
              farmerName: farmer.name,
              village: String(farmer.village_name || farmer.village || ""),
              latitude: farmer.latitude,
              longitude: farmer.longitude
            })
          }
          onVisit={() => {
            void (async () => {
              const allowed = await requestGpsForFieldWork();
              if (!allowed) return;
              rootNav?.navigate("VisitFlow", {
                screen: "NewVisitFarmer",
                params: { prefill: prefillFromFarmer(farmer), fastRevisit: true }
              });
            })();
          }}
        />,
        true
      );
    },
    [directory.toggleSection, entranceStep, entranceTick, navigation, rootNav, t]
  );

  const ListEmptyComponent = useMemo(() => {
    if (directory.isInitialLoading || directory.sourceCount > 0) return null;
    if (directory.loadError) {
      return (
        <ListStateView
          kind="error"
          title={t("farmers.loadFailed")}
          action={t("common.retry")}
          onAction={directory.onRefresh}
          compact
        />
      );
    }
    return (
      <ListStateView
        kind={directory.searchQuery.trim() || directory.villageLabel ? "noResults" : "empty"}
        title={
          directory.searchQuery.trim() || directory.villageLabel
            ? t("farmers.tryDifferentSearch")
            : t("farmers.noFarmers")
        }
        compact
      />
    );
  }, [
    directory.isInitialLoading,
    directory.loadError,
    directory.onRefresh,
    directory.searchQuery,
    directory.sourceCount,
    directory.villageLabel,
    t
  ]);

  const ListFooterComponent = useMemo(
    () =>
      directory.isLoadingMore ? (
        <InlineSeedLoader label={t("work.loadingMore")} />
      ) : null,
    [directory.isLoadingMore, t]
  );

  const stickyIndices = useMemo(() => {
    const indices: number[] = [];
    directory.listData.forEach((row, index) => {
      if (row.type === "section") indices.push(index);
    });
    return indices;
  }, [directory.listData]);

  const toolbar = (
    <View style={styles.toolbar}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.text4} />
        <TextInput
          value={directory.searchQuery}
          onChangeText={directory.setSearchQuery}
          placeholder={t("farmers.searchPlaceholder")}
          placeholderTextColor={Colors.text4}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {directory.villageLabel ? (
          <Pressable
            onPress={directory.clearVillage}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.clearVillageFilter")}
          >
            <Ionicons name="close-circle" size={16} color={Colors.text4} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => villageSheetRef.current?.open()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t("a11y.filterByVillage")}
          >
            <Ionicons name="filter-outline" size={16} color={Colors.text3} />
          </Pressable>
        )}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaCopy}>
          <Text style={styles.totalText}>{directory.totalFarmersLabel}</Text>
          <Text style={styles.syncTimeText}>{directory.lastSyncLabel}</Text>
        </View>
        <Pressable
          onPress={directory.handleSyncAll}
          disabled={directory.syncingAll}
          style={({ pressed }) => [
            styles.syncBtn,
            directory.syncingAll && styles.syncBtnDisabled,
            pressed && !directory.syncingAll && { opacity: 0.88 }
          ]}
        >
          {directory.syncingAll ? (
            <ActivityIndicator size={13} color={Colors.brand700} />
          ) : (
            <Ionicons name="refresh" size={14} color={Colors.brand700} />
          )}
          <Text style={styles.syncBtnText} numberOfLines={1}>
            {syncBtnLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const showBlockingLoader = directory.isInitialLoading && !directory.hasFullCache;
  const showUpdatingBar = directory.isInitialLoading && directory.hasFullCache;

  return (
    <View style={styles.shell}>
      {entranceTick ? (
        <FadeInSection replayKey={entranceTick} delay={entranceStagger(entranceStep)}>
          {toolbar}
        </FadeInSection>
      ) : (
        toolbar
      )}

      {directory.villageLabel ? (
        <View style={styles.villageChipRow}>
          <Text style={styles.villageChipLabel}>{directory.villageLabel}</Text>
          <Pressable onPress={directory.clearVillage}>
            <Text style={styles.villageChipClear}>{t("farmers.clearFilters")}</Text>
          </Pressable>
        </View>
      ) : null}

      {directory.syncingAll && directory.syncProgress ? (
        <View style={styles.progressTrack}>
          <FlatProgressBar
            progress={directory.syncProgress.current / Math.max(directory.syncProgress.total, 1)}
            height={3}
            color={DS.accent}
            trackColor={BRAND_COLORS.primarySoft}
          />
        </View>
      ) : null}

      {directory.offlineToast ? (
        <View style={styles.offlineToast}>
          <Ionicons
            name={directory.lanOnly ? "warning-outline" : "cloud-offline-outline"}
            size={16}
            color={Colors.amberText}
          />
          <Text style={styles.offlineToastText}>
            {directory.lanOnly ? LAN_OFFLINE_BANNER_MESSAGE : t("farmers.connectToSync")}
          </Text>
        </View>
      ) : null}

      {!directory.hasFullCache && directory.isOffline ? (
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheBannerText}>{t("farmers.syncWhileOnline")}</Text>
          <Pressable onPress={directory.handleSyncAll} style={styles.cacheBannerBtn}>
            <Text style={styles.cacheBannerBtnText}>{t("farmers.syncAll")}</Text>
          </Pressable>
        </View>
      ) : null}

      {showUpdatingBar ? (
        <View style={styles.updatingBar}>
          <InlineSeedLoader label={t("home.syncing")} />
        </View>
      ) : null}

      <View style={styles.listArea}>
        {showBlockingLoader ? (
          <ScreenLoader compact message={t("common.loading")} />
        ) : (
          <FlashList
            data={directory.listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemType={(item) => item.type}
            stickyHeaderIndices={stickyIndices}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: tabInset + Layout.scrollBottomExtra, paddingTop: 4 }}
            refreshControl={
              <RefreshControl
                refreshing={directory.isRefreshing}
                onRefresh={directory.onRefresh}
                {...refreshControlProps}
              />
            }
            onEndReached={directory.onEndReached}
            onEndReachedThreshold={0.2}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={ListEmptyComponent}
          />
        )}
      </View>

      <VillageFilterSheet
        ref={villageSheetRef}
        villages={villages}
        onSelect={(id, name) => {
          directory.setSelectedVillageId(id);
          directory.setSelectedVillageName(name);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0
  },
  listArea: {
    flex: 1,
    minHeight: 0
  },
  toolbar: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: Layout.buttonHeight - 4,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.lg
  },
  searchInput: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.base,
    paddingVertical: 0
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between"
  },
  metaCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  totalText: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  syncTimeText: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  },
  syncBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  syncBtnDisabled: {
    opacity: 0.65
  },
  syncBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    maxWidth: 88
  },
  villageChipRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm
  },
  villageChipLabel: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  villageChipClear: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  progressTrack: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm
  },
  offlineToast: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  offlineToastText: {
    color: Colors.amberText,
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium
  },
  updatingBar: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
    paddingVertical: Spacing.sm
  },
  updatingText: {
    color: Colors.text2,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium
  },
  cacheBanner: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  cacheBannerText: {
    color: Colors.amberText,
    flex: 1,
    fontSize: FontSize.sm
  },
  cacheBannerBtn: {
    backgroundColor: Colors.surface,
    borderColor: Colors.amber,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  cacheBannerBtnText: {
    color: Colors.amberText,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  sectionEmpty: {
    marginBottom: 4,
    marginHorizontal: Spacing.lg,
    paddingVertical: 4
  },
  sectionEmptyText: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  list: {
    flex: 1
  },
  skeletonWrap: {
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingTop: 8
  },
  footerLoader: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 16,
    paddingTop: 12
  },
  footerLoaderText: {
    color: Colors.text3,
    fontSize: FontSize.sm
  }
});
