import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Briefcase, Calendar, CalendarDays, User, type LucideIcon } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FAB_RISE_ABOVE_BAR } from "../../../src/theme/tabBar";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Grid, Motion, PremiumShadow } from "../../lib/designSystem";
import { FieldPalette } from "../../lib/fieldTheme";
import { LucideGlyph } from "../ui/AppIcon";
import { Colors, FontSize, FontWeight, Layout, Spacing } from "../../lib/theme";

const TAB_RADIUS = 30;

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
  const pillStyle = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: Motion.fast }),
    transform: [{ scale: withSpring(focused ? 1 : 0.94, Motion.springSoft) }]
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.04 : 1, Motion.springSnappy) }]
  }));

  return (
    <View style={styles.tabItem}>
      <Animated.View style={[styles.activePill, pillStyle]} />
      <Animated.View style={iconStyle}>
        <LucideGlyph icon={Icon} size={21} color={focused ? Colors.brand700 : Colors.text3} strokeWidth={focused ? 2.2 : 1.8} />
      </Animated.View>
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
      <View style={[styles.barShell, PremiumShadow.float]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={36} tint="light" style={[StyleSheet.absoluteFill, styles.barBlur]} />
        ) : null}
        <View style={styles.glassTint} pointerEvents="none" />
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
            const Icon = meta?.Icon ?? Calendar;

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
    backgroundColor: "transparent",
    overflow: "visible",
    paddingHorizontal: Grid.md,
    paddingTop: FAB_RISE_ABOVE_BAR + Spacing.xs
  },
  barShell: {
    borderColor: FieldPalette.glassBorder,
    borderRadius: TAB_RADIUS,
    borderWidth: 1,
    minHeight: Layout.tabBarHeight - 4,
    overflow: "visible",
    position: "relative"
  },
  barBlur: {
    borderRadius: TAB_RADIUS
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === "ios" ? "rgba(255, 252, 247, 0.55)" : "rgba(255, 252, 247, 0.88)",
    borderRadius: TAB_RADIUS
  },
  barRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Layout.tabBarHeight - 4,
    paddingHorizontal: Grid.xs
  },
  tabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 50,
    paddingBottom: 4
  },
  fabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 50,
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
    gap: 4,
    justifyContent: "flex-end",
    minHeight: 44,
    paddingHorizontal: 6,
    position: "relative",
    width: "100%"
  },
  activePill: {
    backgroundColor: "rgba(15, 107, 67, 0.11)",
    borderRadius: 14,
    bottom: 0,
    left: 2,
    position: "absolute",
    right: 2,
    top: 0
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
