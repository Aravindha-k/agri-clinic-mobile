import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VisitFabTabButton } from "../ui/VisitFabTabButton";
import { ENT } from "../../theme/enterprise";

function TabIcon({
  name,
  activeName,
  focused,
  label
}: {
  name: keyof typeof Ionicons.glyphMap;
  activeName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  label: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!focused) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.15, useNativeDriver: true, speed: 40, bounciness: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 })
    ]).start();
  }, [focused, scale]);

  return (
    <View style={styles.tabItem}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={focused ? activeName : name}
          size={22}
          color={focused ? ENT.primary : ENT.textMuted}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

const TAB_META: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  Home: { icon: "home-outline", activeIcon: "home", label: "Home" },
  Farmers: { icon: "people-outline", activeIcon: "people", label: "Farmers" },
  StartVisit: { icon: "add", activeIcon: "add", label: "" },
  Visits: { icon: "clipboard-outline", activeIcon: "clipboard", label: "Visits" },
  Profile: { icon: "person-outline", activeIcon: "person", label: "Profile" }
};

export default function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name];

          if (route.name === "StartVisit") {
            return (
              <View key={route.key} style={styles.fabSlot}>
                <VisitFabTabButton
                  accessibilityState={{ selected: focused }}
                  onPress={() => {}}
                  onLongPress={() => {}}
                  style={{}}
                >
                  {null}
                </VisitFabTabButton>
              </View>
            );
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tabSlot} accessibilityRole="button">
              {meta ? (
                <TabIcon
                  name={meta.icon}
                  activeName={meta.activeIcon}
                  focused={focused}
                  label={meta.label}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: ENT.card,
    borderTopColor: ENT.border,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-around",
    minHeight: 56,
    paddingHorizontal: 8,
    paddingTop: 6
  },
  tabSlot: {
    alignItems: "center",
    flex: 1
  },
  fabSlot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end"
  },
  tabItem: {
    alignItems: "center",
    gap: 2
  },
  tabLabel: {
    color: ENT.textMuted,
    fontSize: 9,
    fontWeight: "600"
  },
  tabLabelActive: {
    color: ENT.primary,
    fontWeight: "700"
  }
});
