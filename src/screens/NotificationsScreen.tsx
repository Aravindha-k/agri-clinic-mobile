import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, PrimaryButton, PremiumCard } from "../components/ui";
import { iconForType, useNotifications } from "../storage/NotificationsContext";
import { useTheme } from "../theme";
import { space } from "../theme/layout";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function NotificationsScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { items, unreadCount, markRead, markAllRead, clearAll } = useNotifications();

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <AppHeader
        title="Notifications"
        subtitle={unreadCount ? `${unreadCount} unread` : "All caught up"}
        right={
          items.length ? (
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>Read all</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <PremiumCard elevated tint="soft" style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color={c.muted} />
            <Text style={[styles.emptyTitle, { color: c.text }]}>No alerts yet</Text>
            <Text style={[styles.emptySub, { color: c.muted }]}>
              GPS, sync, session, and workday updates will appear here.
            </Text>
          </PremiumCard>
        ) : (
          items.map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => markRead(n.id)}
              style={({ pressed }) => pressed && { opacity: 0.92 }}
            >
              <PremiumCard
                elevated
                tint={n.read ? "soft" : "primary"}
                style={n.read ? styles.card : StyleSheet.flatten([styles.card, styles.cardUnread, { borderColor: c.primary }])}
              >
                <View style={styles.cardRow}>
                  <View style={[styles.iconCircle, { backgroundColor: c.primarySoft }]}>
                    <Ionicons name={iconForType(n.type)} size={20} color={c.primaryDark} />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{n.title}</Text>
                    <Text style={[styles.cardMsg, { color: c.muted }]}>{n.message}</Text>
                    <Text style={[styles.cardTime, { color: c.muted }]}>{formatWhen(n.createdAt)}</Text>
                  </View>
                  {!n.read ? <View style={[styles.dot, { backgroundColor: c.primary }]} /> : null}
                </View>
              </PremiumCard>
            </Pressable>
          ))
        )}
        {items.length > 0 ? (
          <PrimaryButton title="Clear all" onPress={clearAll} variant="outline" style={{ marginTop: space.md }} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { gap: 10, padding: space.lg, paddingBottom: 32 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 8 },
  emptySub: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  card: { paddingVertical: 12 },
  cardUnread: { borderWidth: 1 },
  cardRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  iconCircle: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "800" },
  cardMsg: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  cardTime: { fontSize: 11, marginTop: 6 },
  dot: { borderRadius: 5, height: 10, marginTop: 6, width: 10 }
});
