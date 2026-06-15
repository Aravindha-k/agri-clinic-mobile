import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSyncStore } from "../../../mobile/lib/store/syncStore";
import { TAB_BAR } from "../../theme/globalStyles";

type TabIconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { outline: TabIconName; solid: TabIconName }> = {
  Home: { outline: "home-outline", solid: "home" },
  Farmers: { outline: "people-outline", solid: "people" },
  Visits: { outline: "clipboard-outline", solid: "clipboard" },
  Profile: { outline: "person-outline", solid: "person" }
};

export function TabBarIcon({
  routeName,
  focused,
  color
}: {
  routeName: string;
  focused: boolean;
  color: string;
}) {
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);
  const scale = useRef(new Animated.Value(1)).current;
  const icons = TAB_ICONS[routeName];
  const showHomeDot = routeName === "Home" && unreadNotifCount > 0;

  useEffect(() => {
    if (!focused) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 })
    ]).start();
  }, [focused, scale]);

  if (!icons) return null;

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={focused ? icons.solid : icons.outline} size={TAB_BAR.iconSize} color={color} />
      </Animated.View>
      {showHomeDot ? <View style={styles.dot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  dot: {
    backgroundColor: "#dc2626",
    borderRadius: 4,
    height: 8,
    position: "absolute",
    right: -4,
    top: -2,
    width: 8
  }
});
