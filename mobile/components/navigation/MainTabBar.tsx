import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Briefcase, Calendar, CalendarDays, User, type LucideIcon } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FAB_RISE_ABOVE_BAR } from "../../../src/theme/tabBar";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Grid } from "../../lib/designSystem";
import { LucideGlyph } from "../ui/AppIcon";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../lib/theme";

const TAB_RADIUS = 28;

const TAB_META: Record<string, { Icon: LucideIcon; labelKey?: string }> = {
  Today: { Icon: Calendar, labelKey: "tabs.today" },
  Work: { Icon: Briefcase, labelKey: "tabs.work" },
  Day: { Icon: CalendarDays, labelKey: "tabs.day" },
  Me: { Icon: User, labelKey: "tabs.me" }
};

function TabItem({
  focused,
  label,
  Icon,
  badge
}: {
  focused: boolean;
  label: string;
  Icon: LucideIcon;
  badge?: string | number;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
        <View style={[styles.activeDot, focused ? styles.activeDotVisible : styles.activeDotHidden]} />
        <LucideGlyph
          icon={Icon}
          size={21}
          color={focused ? Colors.brand700 : Colors.text3}
          strokeWidth={focused ? 2.2 : 1.8}
        />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      {badge != null && badge !== "" ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function MainTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <View
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}
      pointerEvents="box-none"
    >
      <View style={styles.barShell} pointerEvents="box-none">
        {/* Clipped background — overflow:hidden so Android doesn't show a square fill */}
        <View style={styles.barBackground} pointerEvents="none">
          {Platform.OS === "ios" ? (
            <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={styles.glassTint} />
        </View>

        <View style={styles.barRow}>
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
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            if (TabBarButton) {
              return (
                <View key={route.key} style={styles.fabSlot} pointerEvents="box-none">
                  <TabBarButton
                    accessibilityRole="tab"
                    accessibilityState={{ selected: focused }}
                    accessibilityLabel={options.tabBarAccessibilityLabel ?? t("tabs.newVisit")}
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
            const Icon = meta?.Icon ?? Calendar;

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabSlot}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              >
                <TabItem focused={focused} label={label} Icon={Icon} badge={options.tabBarBadge} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.bg,
    overflow: "visible",
    paddingHorizontal: Grid.md,
    paddingTop: FAB_RISE_ABOVE_BAR + Spacing.xs
  },
  barShell: {
    minHeight: Layout.tabBarHeight - 4,
    overflow: "visible",
    position: "relative"
  },
  barBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: TAB_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: Platform.OS === "android" ? 8 : 0,
    overflow: "hidden",
    shadowColor: "#0B3D28",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.42)" : "rgba(255, 255, 255, 0.92)"
  },
  barRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Layout.tabBarHeight - 4,
    paddingHorizontal: Grid.xs,
    zIndex: 2
  },
  tabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: Layout.touchTargetMin,
    paddingBottom: 6
  },
  fabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: Layout.touchTargetMin,
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
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: 4,
    position: "relative",
    width: "100%"
  },
  iconWrap: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28
  },
  iconWrapFocused: {
    transform: [{ scale: 1.05 }]
  },
  activeDot: {
    backgroundColor: "rgba(15, 107, 67, 0.14)",
    borderRadius: 14,
    height: 28,
    position: "absolute",
    width: 28
  },
  activeDotVisible: {
    opacity: 1,
    transform: [{ scale: 1 }]
  },
  activeDotHidden: {
    opacity: 0,
    transform: [{ scale: 0.85 }]
  },
  tabLabel: {
    color: Colors.text3,
    fontSize: FontSize.label,
    fontWeight: FontWeight.medium,
    maxWidth: 76,
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
    right: 2,
    top: -2
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  }
});
