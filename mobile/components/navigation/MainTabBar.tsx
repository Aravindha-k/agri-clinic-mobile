import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FAB_RISE_ABOVE_BAR } from "../../../src/theme/tabBar";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../lib/theme";

const TAB_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; labelKey?: string }
> = {
  Today: { icon: "today-outline", activeIcon: "today", labelKey: "tabs.today" },
  Work: { icon: "briefcase-outline", activeIcon: "briefcase", labelKey: "tabs.work" },
  StartVisit: { icon: "add", activeIcon: "add" },
  Day: { icon: "calendar-outline", activeIcon: "calendar", labelKey: "tabs.day" },
  Me: { icon: "person-outline", activeIcon: "person", labelKey: "tabs.me" }
};

export default function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]} pointerEvents="box-none">
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name];
          const { options } = descriptors[route.key];
          const TabBarButton = options.tabBarButton;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });
            if (!focused && !event.defaultPrevented && route.name !== "StartVisit") {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key
            });
          };

          if (TabBarButton) {
            return (
              <View key={route.key} style={styles.fabSlot} pointerEvents="box-none">
                <TabBarButton
                  accessibilityRole="button"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  testID={options.tabBarTestID}
                  style={styles.fabButton}
                >
                  {null}
                </TabBarButton>
              </View>
            );
          }

          const label =
            (typeof options.tabBarLabel === "string" && options.tabBarLabel) ||
            (meta?.labelKey ? t(meta.labelKey) : route.name);

          const badge = options.tabBarBadge;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabSlot}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            >
              <View style={styles.tabItem}>
                <Ionicons
                  name={focused ? meta?.activeIcon ?? "ellipse" : meta?.icon ?? "ellipse-outline"}
                  size={22}
                  color={focused ? Colors.brand700 : Colors.text3}
                />
                <Text
                  style={[styles.tabLabel, focused && styles.tabLabelActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {label}
                </Text>
                {badge != null && badge !== "" ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: Layout.cardBorderWidth,
    overflow: "visible",
    paddingTop: FAB_RISE_ABOVE_BAR + Spacing.xs
  },
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Layout.tabBarHeight,
    overflow: "visible",
    paddingHorizontal: Spacing.xs
  },
  tabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 48,
    paddingBottom: 2
  },
  fabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 48,
    overflow: "visible",
    zIndex: 30
  },
  fabButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    overflow: "visible",
    width: "100%"
  },
  tabItem: {
    alignItems: "center",
    gap: 3,
    justifyContent: "flex-end",
    minHeight: 42,
    position: "relative",
    width: "100%"
  },
  tabLabel: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    maxWidth: 72,
    textAlign: "center"
  },
  tabLabelActive: {
    color: Colors.brand700,
    fontWeight: FontWeight.bold
  },
  badge: {
    backgroundColor: Colors.red,
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 4,
    position: "absolute",
    right: 4,
    top: 0
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  }
});
