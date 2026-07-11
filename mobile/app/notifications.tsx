import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRefreshControlProps } from "../../src/hooks/useRefreshControlProps";
import { useI18n } from "../../src/i18n/I18nContext";
import { formatRelativeTimeLocalized, type AppLanguage } from "../../src/i18n";
import { requestGpsForFieldWork } from "../../src/utils/locationRequiredModal";
import {
  navigateOfflineSync,
  navigateVisitDetail,
  navigateVisitFlow
} from "../../src/navigation/rootNavigationRef";
import { EmptyState, FilterChipRow, PressableCard } from "../components/ui";
import { FlatCard, ScreenCanvas, StackScreenHeader } from "../components/layout";
import { InlineSeedLoader } from "../components/layout/InlineSeedLoader";
import { ScreenLoader } from "../components/layout/ScreenLoader";
import { useScreenTopEdges } from "../hooks/useScreenTopEdges";
import {
  fetchNotificationsPage,
  getBadgeCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationType
} from "../lib/notificationsApi";
import { useSyncStore } from "../lib/store/syncStore";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../lib/theme";

type FilterId = "all" | "unread";

type IconConfig = {
  name: keyof typeof Ionicons.glyphMap;
  bg: string;
  color: string;
};

function iconForType(type: NotificationType): IconConfig {
  switch (type) {
    case "visit":
      return { name: "location", bg: Colors.blueBg, color: Colors.blue };
    case "follow_up":
      return { name: "calendar", bg: Colors.amberBg, color: Colors.amber };
    case "sync_fail":
      return { name: "cloud-offline", bg: Colors.redBg, color: Colors.red };
    case "gps":
      return { name: "radio", bg: Colors.purpleBg, color: Colors.purple };
    default:
      return { name: "settings", bg: Colors.brand50, color: Colors.text3 };
  }
}

function NotificationRow({
  item,
  language,
  onPress
}: {
  item: AppNotification;
  language: AppLanguage;
  onPress: (item: AppNotification) => void;
}) {
  const icon = iconForType(item.notification_type);
  const unread = !item.is_read;

  return (
    <PressableCard onPress={() => onPress(item)} style={styles.rowWrap}>
      <FlatCard style={[styles.row, unread ? styles.rowUnread : styles.rowRead]}>
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowMessage, unread && styles.rowMessageUnread]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        <Text style={styles.rowTime}>{formatRelativeTimeLocalized(language, item.created_at)}</Text>
      </FlatCard>
    </PressableCard>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { t, language } = useI18n();
  const topEdges = useScreenTopEdges();
  const refreshControlProps = useRefreshControlProps();
  const requestId = useRef(0);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterId>("all");
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const setUnreadNotifCount = useSyncStore((state) => state.setUnreadNotifCount);

  const unreadCount = useMemo(() => items.filter((row) => !row.is_read).length, [items]);

  const visibleItems = useMemo(() => {
    if (filter === "unread") return items.filter((row) => !row.is_read);
    return items;
  }, [filter, items]);

  const filters = useMemo(
    () => [
      { id: "all" as const, label: t("notifications.filterAll") },
      { id: "unread" as const, label: t("notifications.filterUnread") }
    ],
    [t]
  );

  const loadPage = useCallback(async (opts?: { refresh?: boolean; next?: string | null }) => {
    const id = ++requestId.current;
    if (!opts?.next) {
      if (!opts?.refresh) setLoading(true);
      setError("");
    } else {
      setLoadingMore(true);
    }

    try {
      const page = await fetchNotificationsPage(
        opts?.next
          ? { nextUrl: opts.next, unreadOnly: filter === "unread" }
          : { page: 1, unreadOnly: filter === "unread" }
      );
      if (id !== requestId.current) return;

      if (opts?.next) {
        setItems((prev) => [...prev, ...page.results]);
      } else {
        setItems(page.results);
        const unreadOnPage = page.results.filter((row) => !row.is_read).length;
        setUnreadNotifCount(unreadOnPage);
      }
      setNextUrl(page.next);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : t("notifications.loadError"));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [filter, t]);

  const filterBootstrapped = useRef(false);

  useEffect(() => {
    if (!filterBootstrapped.current) {
      filterBootstrapped.current = true;
      return;
    }
    void loadPage({ refresh: true });
  }, [filter, loadPage]);

  useFocusEffect(
    useCallback(() => {
      void loadPage();
      return () => {
        void getBadgeCount(true);
      };
    }, [loadPage])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadPage({ refresh: true });
  }

  async function handleMarkAllRead() {
    if (!unreadCount || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((row) => ({ ...row, is_read: true })));
      setUnreadNotifCount(0);
      await getBadgeCount(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.loadError"));
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleRowPress(item: AppNotification) {
    try {
      if (!item.is_read) {
        setItems((prev) => {
          const next = prev.map((row) => (row.id === item.id ? { ...row, is_read: true } : row));
          setUnreadNotifCount(Math.max(0, useSyncStore.getState().unreadNotifCount - 1));
          return next;
        });
        void markNotificationRead(item.id).catch(() => undefined);
      }

      switch (item.notification_type) {
        case "visit": {
          if (item.reference_id) {
            navigateVisitDetail(item.reference_id);
          }
          break;
        }
        case "follow_up": {
          const allowed = await requestGpsForFieldWork();
          if (!allowed) break;
          navigateVisitFlow({
            screen: "NewVisitFarmer",
            params: {
              prefill: {
                farmer_id: item.farmer_id != null ? String(item.farmer_id) : undefined,
                farmer_name: item.farmer_name ?? undefined,
                crop_name: item.crop_name ?? undefined
              },
              fastRevisit: true
            }
          });
          break;
        }
        case "sync_fail": {
          navigateOfflineSync();
          break;
        }
        default:
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notifications.loadError"));
    }
  }

  const headerRight =
    unreadCount > 0 ? (
      <Pressable
        onPress={() => void handleMarkAllRead()}
        disabled={markingAll}
        style={styles.markAllBtn}
      >
        {markingAll ? (
          <ActivityIndicator size="small" color={Colors.brand700} />
        ) : (
          <Text style={styles.markAllText}>{t("notifications.markAllRead")}</Text>
        )}
      </Pressable>
    ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={topEdges}>
      <ScreenCanvas />
      <StackScreenHeader
        title={t("notifications.title")}
        onBack={() => navigation.goBack()}
        right={headerRight}
        includeSafeTop={false}
      />

      <FilterChipRow style={styles.filters}>
        {filters.map((chip) => {
          const active = filter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setFilter(chip.id)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </FilterChipRow>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading && items.length === 0 ? (
        <ScreenLoader />
      ) : (
        <FlashList
          data={visibleItems}
          renderItem={({ item }) => (
            <NotificationRow item={item} language={language} onPress={handleRowPress} />
          )}
          keyExtractor={(item) => String(item.id)}
          style={styles.list}
          contentContainerStyle={{
            paddingBottom: Layout.stackScrollBottom,
            paddingHorizontal: Spacing.screen,
            paddingTop: Spacing.sm
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
          onEndReached={() => {
            if (nextUrl && !loadingMore) void loadPage({ next: nextUrl });
          }}
          onEndReachedThreshold={0.25}
          ListFooterComponent={loadingMore ? <InlineSeedLoader /> : null}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="happy-outline"
                title={t("notifications.emptyTitle")}
                subtitle={t("notifications.emptySubtitle")}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  list: {
    flex: 1
  },
  filters: {
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.screen
  },
  markAllBtn: {
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: 40,
    paddingLeft: Spacing.sm
  },
  markAllText: {
    color: Colors.brand700,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  filterChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm
  },
  filterChipActive: {
    backgroundColor: Colors.brand700,
    borderColor: Colors.brand700
  },
  filterChipText: {
    color: Colors.text2,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  },
  filterChipTextActive: {
    color: Colors.surface
  },
  errorText: {
    color: Colors.red,
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.screen
  },
  rowWrap: {
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.screen
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 56,
    padding: Spacing.lg
  },
  rowUnread: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand100,
    borderWidth: StyleSheet.hairlineWidth
  },
  rowRead: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  iconBox: {
    alignItems: "center",
    borderRadius: Radius.inner,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  rowContent: {
    flex: 1
  },
  rowMessage: {
    color: Colors.text2,
    fontSize: FontSize.md,
    lineHeight: 20
  },
  rowMessageUnread: {
    color: Colors.text1,
    fontWeight: FontWeight.semibold
  },
  rowTime: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    maxWidth: 72,
    textAlign: "right"
  }
});
