import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { FAB_RISE_ABOVE_BAR, FAB_SIZE, TAB_BAR_CONTENT_HEIGHT } from "../../theme/tabBar";
import { useGpsWorkGuard } from "../../hooks/useGpsWorkGuard";
import { useActiveWorkday } from "../../hooks/useActiveWorkday";

const TAB_ICON_SIZE = 22;
const FAB_ICON_SIZE = 24;

const TAB_ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; solid: keyof typeof Ionicons.glyphMap }> = {
  Home: { outline: "home-outline", solid: "home" },
  Farmers: { outline: "people-outline", solid: "people" },
  Visits: { outline: "clipboard-outline", solid: "clipboard" },
  Profile: { outline: "person-outline", solid: "person" }
};

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useDesignSystem();
  const insets = useSafeAreaInsetsCompat();
  const safeBottom = Math.max(insets.bottom, 0);
  const { canRunWorkAction } = useGpsWorkGuard();
  const { requireActiveWorkday } = useActiveWorkday();

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.borderSubtle ?? colors.border,
          paddingBottom: safeBottom
        },
        shadows.elevated
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.row, { height: TAB_BAR_CONTENT_HEIGHT }]}>
        {state.routes.map((route) => {
          if (route.name === "StartVisit") {
            return (
              <View key={route.key} style={styles.fabSlot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start visit"
                  onPress={() => {
                    if (!canRunWorkAction() || !requireActiveWorkday()) return;
                    navigation.getParent()?.navigate("VisitFlow", { screen: "NewVisitFarmer", params: { fresh: true } });
                  }}
                  style={({ pressed }) => [styles.fabWrap, pressed && styles.fabPressed]}
                >
                  <View style={[styles.fab, { backgroundColor: colors.fab }, shadows.fab]}>
                    <Ionicons name="add" size={FAB_ICON_SIZE} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.fabLabel, { color: colors.primary }]}>Visit</Text>
                </Pressable>
              </View>
            );
          }

          const index = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;
          const icons = TAB_ICONS[route.name];
          const color = focused ? colors.primary : colors.muted;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => navigation.navigate(route.name)}
              style={({ pressed }) => [styles.tab, pressed && { opacity: 0.9 }]}
            >
              <View style={[styles.iconWrap, focused && { backgroundColor: colors.primarySoft }]}>
                {icons ? <Ionicons name={focused ? icons.solid : icons.outline} size={TAB_ICON_SIZE} color={color} /> : null}
              </View>
              <Text style={[styles.label, { color, fontWeight: focused ? "800" : "600" }]} numberOfLines={1}>
                {typeof label === "string" ? label : route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 10
  },
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    paddingHorizontal: 4
  },
  tab: {
    alignItems: "center",
    flex: 1,
    gap: 2,
    justifyContent: "center",
    paddingBottom: 4,
    paddingTop: 6
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  fabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    maxWidth: FAB_SIZE + 24,
    paddingBottom: 2
  },
  fabWrap: {
    alignItems: "center",
    gap: 2,
    marginTop: -FAB_RISE_ABOVE_BAR
  },
  fab: {
    alignItems: "center",
    borderRadius: FAB_SIZE / 2,
    height: FAB_SIZE,
    justifyContent: "center",
    width: FAB_SIZE
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center"
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }]
  },
  label: {
    fontSize: 10,
    textAlign: "center"
  }
});
