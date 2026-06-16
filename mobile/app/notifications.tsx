import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRefreshControlProps } from "../../src/hooks/useRefreshControlProps";
import { useSafeAreaInsetsCompat } from "../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../src/hooks/useSecureScreen";
import { formatRelativeTime } from "../../src/utils/formatRelativeTime";
import { requestGpsForFieldWork } from "../../src/utils/locationRequiredModal";
import { EmptyState, FilterChipRow } from "../components/ui";
import { EntranceBlocks } from "../components/ui/EntranceBlocks";
import { FadeInSection, entranceListStagger, entranceStagger } from "../components/ui/FadeInSection";
import { ScreenEntranceShell } from "../components/layout";
import { ScreenLoader } from "../components/layout/ScreenLoader";
import {
  fetchNotificationsPage,
  getBadgeCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationType
} from "../lib/notificationsApi";
import { useSyncStore } from "../lib/store/syncStore";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../lib/theme";

type FilterId = "all" | "unread";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" }
];

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
      return { name: "settings", bg: "#f3f4f6", color: Colors.text3 };
  }
}

function NotificationRow({
  item,
  onPress
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  const icon = iconForType(item.notification_type);
  const unread = !item.is_read;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        unread ? styles.rowUnread : styles.rowRead,
        pressed && { opacity: 0.94 }
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={16} color={icon.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      <Text style={styles.rowTime}>{formatRelativeTime(item.created_at)}</Text>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const rootNav = navigation.getParent();
  const { top: safeTop } = useSafeAreaInsetsCompat();
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
        opts?.next ? { nextUrl: opts.next } : { page: 1 }
      );
      if (id !== requestId.current) return;

      if (opts?.next) {
        setItems((prev) => [...prev, ...page.results]);
      } else {
        setItems(page.results);
      }
      setNextUrl(page.next);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [setUnreadNotifCount]);

  useFocusEffect(
    useCallback(() => {
      setUnreadNotifCount(0);
      void loadPage();
      return () => {
        void getBadgeCount(true);
      };
    }, [loadPage, setUnreadNotifCount])
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
      setError(err instanceof Error ? err.message : "Could not mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleRowPress(item: AppNotification) {
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
          rootNav?.navigate("Main", {
            screen: "Work",
            params: { screen: "VisitDetail", params: { id: item.reference_id } }
          });
        }
        break;
      }
      case "follow_up": {
        const allowed = await requestGpsForFieldWork();
        if (!allowed) break;
        rootNav?.navigate("VisitFlow", {
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
        rootNav?.navigate("Main", {
          screen: "Me",
          params: { screen: "ProfileMain" }
        });
        break;
      }
      default:
        break;
    }
  }

  const listHeader = (entranceTick: number) => (
    <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
      <View style={styles.headerBlock}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <Text style={styles.screenTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => void handleMarkAllRead()}
            disabled={markingAll}
            style={styles.markAllBtn}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={Colors.brand700} />
            ) : (
              <Text style={styles.markAllText}>Mark all read</Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <FilterChipRow>
        {FILTERS.map((chip) => {
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
      </View>
    </FadeInSection>
  );

  return (
    <ScreenEntranceShell style={[styles.screen, { paddingTop: safeTop }]}>
      {(entranceTick) =>
        loading && items.length === 0 ? (
          <ScreenLoader />
        ) : (
          <FlashList
            data={visibleItems}
            renderItem={({ item, index }) => (
              <FadeInSection
                replayKey={entranceTick}
                delay={entranceListStagger(1, index)}
                variant="card"
              >
                <NotificationRow item={item} onPress={handleRowPress} />
              </FadeInSection>
            )}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={listHeader(entranceTick)}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: Spacing.screen }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />}
            onEndReached={() => {
              if (nextUrl && !loadingMore) void loadPage({ next: nextUrl });
            }}
            onEndReachedThreshold={0.25}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={Colors.brand700} /> : null
            }
            ListEmptyComponent={
              !loading ? (
                <EntranceBlocks replayKey={entranceTick} startStep={1}>
                  <EmptyState icon="happy-outline" title="All caught up" subtitle="No notifications" />
                </EntranceBlocks>
              ) : null
            }
          />
        )
      }
    </ScreenEntranceShell>
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
  loadingWrap: {
    flex: 1,
    paddingHorizontal: Spacing.screen
  },
  skeleton: {
    marginTop: Spacing.md
  },
  headerBlock: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  iconBtn: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
  },
  screenTitle: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  markAllBtn: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 96,
    paddingLeft: Spacing.sm
  },
  markAllText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  filterRow: {
    gap: Spacing.sm
  },
  filterChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm
  },
  filterChipActive: {
    backgroundColor: Colors.brand700,
    borderColor: Colors.brand700
  },
  filterChipText: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  filterChipTextActive: {
    color: Colors.surface
  },
  errorText: {
    color: Colors.red,
    fontSize: FontSize.sm
  },
  row: {
    alignItems: "center",
    borderRadius: Radius.card,
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md
  },
  rowUnread: {
    backgroundColor: Colors.surface,
    borderLeftColor: Colors.brand700,
    borderLeftWidth: 3
  },
  rowRead: {
    backgroundColor: Colors.bg
  },
  iconBox: {
    alignItems: "center",
    borderRadius: Radius.sm,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  rowContent: {
    flex: 1
  },
  rowMessage: {
    color: Colors.text1,
    fontSize: FontSize.base,
    lineHeight: 18
  },
  rowTime: {
    color: Colors.text4,
    fontSize: FontSize.xs,
    maxWidth: 72,
    textAlign: "right"
  },
  footerSpinner: {
    marginVertical: Spacing.lg
  }
});
