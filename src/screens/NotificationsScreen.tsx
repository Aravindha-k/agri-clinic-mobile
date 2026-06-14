import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { EmptyState } from "../components/EmptyState";
import { FadeInView } from "../components/FadeInView";
import { AppHeader, PrimaryButton } from "../components/ui";
import { StatusChip } from "../components/ui/StatusChip";
import { iconForType, useNotifications, type AppNotification, type AppNotificationType } from "../storage/NotificationsContext";
import { useDesignSystem } from "../hooks/useDesignSystem";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function chipForType(type: AppNotificationType): "warning" | "offline" | "pending" | "online" | "completed" {
  switch (type) {
    case "sync_failed":
    case "upload_failed":
      return "offline";
    case "gps_off":
      return "warning";
    case "workday_expired":
      return "pending";
    default:
      return "completed";
  }
}

function bucketNotifications(items: AppNotification[]) {
  const todayAlerts: AppNotification[] = [];
  const followUps: AppNotification[] = [];
  const syncIssues: AppNotification[] = [];
  const trackingAlerts: AppNotification[] = [];

  for (const n of items) {
    if (n.type === "sync_failed" || n.type === "upload_failed") {
      syncIssues.push(n);
    } else if (n.type === "gps_off" || n.type === "workday_expired") {
      trackingAlerts.push(n);
    } else if (/follow/i.test(`${n.title} ${n.message}`)) {
      followUps.push(n);
    } else if (isToday(n.createdAt)) {
      todayAlerts.push(n);
    } else {
      todayAlerts.push(n);
    }
  }

  return { todayAlerts, followUps, syncIssues, trackingAlerts };
}

function NotificationCard({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { colors, type, shadows } = useDesignSystem();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.94 }}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: item.read ? colors.card : colors.primarySoft,
            borderColor: item.read ? colors.borderSubtle : colors.primary
          },
          shadows.card
        ]}
      >
        <View style={[styles.icon, { backgroundColor: colors.card }]}>
          <Ionicons name={iconForType(item.type)} size={20} color={colors.primaryDark} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={type.bodyStrong}>{item.title}</Text>
            <StatusChip variant={chipForType(item.type)} compact />
          </View>
          <Text style={[type.meta, { marginTop: 4 }]}>{item.message}</Text>
          <Text style={[type.caption, { marginTop: 6 }]}>{formatWhen(item.createdAt)}</Text>
        </View>
        {!item.read ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

function NotificationSection({
  title,
  items,
  emptyTitle,
  emptyMessage,
  onPressItem
}: {
  title: string;
  items: AppNotification[];
  emptyTitle: string;
  emptyMessage: string;
  onPressItem: (id: string) => void;
}) {
  const { type } = useDesignSystem();
  if (items.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={type.sectionTitle}>{title}</Text>
        <Text style={[type.caption, { marginTop: 4 }]}>{emptyTitle} — {emptyMessage}</Text>
      </View>
    );
  }
  return (
    <FadeInView style={styles.section}>
      <Text style={type.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {items.map((n) => (
          <NotificationCard key={n.id} item={n} onPress={() => onPressItem(n.id)} />
        ))}
      </View>
    </FadeInView>
  );
}

export function NotificationsScreen() {
  const { colors } = useDesignSystem();
  const { items, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const buckets = bucketNotifications(items);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Notifications"
        subtitle={unreadCount ? `${unreadCount} unread` : "All caught up"}
        right={
          items.length ? (
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>Mark all read</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <EmptyState
            title="No notifications yet"
            message="GPS, sync, session, and workday updates will appear here."
            illustration="generic"
          />
        ) : (
          <>
            <NotificationSection
              title="Today's alerts"
              items={buckets.todayAlerts}
              emptyTitle="All clear"
              emptyMessage="no alerts today"
              onPressItem={markRead}
            />
            <NotificationSection
              title="Follow-ups"
              items={buckets.followUps}
              emptyTitle="No follow-ups"
              emptyMessage="scheduled reminders appear here"
              onPressItem={markRead}
            />
            <NotificationSection
              title="Sync issues"
              items={buckets.syncIssues}
              emptyTitle="Synced"
              emptyMessage="no upload problems"
              onPressItem={markRead}
            />
            <NotificationSection
              title="Tracking alerts"
              items={buckets.trackingAlerts}
              emptyTitle="Tracking OK"
              emptyMessage="GPS and workday healthy"
              onPressItem={markRead}
            />
            <PrimaryButton title="Clear all" onPress={clearAll} variant="outline" style={{ marginTop: 8 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { gap: 20, padding: 16, paddingBottom: 32 },
  section: { gap: 10 },
  list: { gap: 10, marginTop: 4 },
  card: {
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  icon: { alignItems: "center", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  copy: { flex: 1 },
  titleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  dot: { borderRadius: 5, height: 10, marginTop: 6, width: 10 },
  cardUnread: {}
});
