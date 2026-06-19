import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppLogo } from "../../../src/components/brand/AppLogo";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  greeting: string;
  name?: string | null;
  dateLabel: string;
  subtitle?: string;
  notificationCount: number;
  onNotifications: () => void;
  onMedia?: boolean;
};

export function TodayHeader({
  greeting,
  name,
  dateLabel,
  subtitle,
  notificationCount,
  onNotifications,
  onMedia = false
}: Props) {
  const title = name?.trim() ? `${greeting}, ${name.trim().split(/\s+/)[0]}` : greeting;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={[styles.brandShell, onMedia && styles.brandShellOnMedia]}>
          <AppLogo
            size="lg"
            showWordmark
            layout="horizontal"
            compactWordmark
            bare
            variant={onMedia ? "light" : "dark"}
            style={styles.brand}
          />
        </View>
        <Pressable
          onPress={onNotifications}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [styles.bell, onMedia && styles.bellOnMedia, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="notifications-outline" size={20} color={onMedia ? "#FFFFFF" : Colors.text2} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text style={[styles.greeting, onMedia && styles.greetingOnMedia]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.date, onMedia && styles.metaOnMedia]}>{dateLabel}</Text>
        {subtitle ? <Text style={[styles.subtitle, onMedia && styles.metaOnMedia]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md
  },
  brandShell: {
    flex: 1,
    minWidth: 0
  },
  brandShellOnMedia: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 999,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  brand: {
    flex: 1,
    minWidth: 0
  },
  copy: {
    gap: 2,
    minWidth: 0
  },
  greeting: {
    color: Colors.text1,
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3
  },
  date: {
    color: Colors.text3,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  bell: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.inner,
    borderWidth: 1,
    flexShrink: 0,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  bellOnMedia: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderColor: "rgba(255,255,255,0.2)"
  },
  badge: {
    alignItems: "center",
    backgroundColor: Colors.red,
    borderRadius: 7,
    height: 14,
    justifyContent: "center",
    minWidth: 14,
    paddingHorizontal: 3,
    position: "absolute",
    right: -2,
    top: -2
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 8,
    fontWeight: FontWeight.bold
  },
  greetingOnMedia: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  metaOnMedia: {
    color: "rgba(255,255,255,0.94)",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  }
});
