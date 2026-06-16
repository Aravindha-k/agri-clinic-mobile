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
};

export function TodayHeader({ greeting, name, dateLabel, subtitle, notificationCount, onNotifications }: Props) {
  const title = name?.trim() ? `${greeting}, ${name.trim().split(/\s+/)[0]}` : greeting;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <AppLogo size="md" showWordmark layout="horizontal" compactWordmark bare style={styles.brand} />
        <Pressable
          onPress={onNotifications}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [styles.bell, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.text2} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.copy}>
        <Text style={styles.greeting} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.date}>{dateLabel}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  }
});
