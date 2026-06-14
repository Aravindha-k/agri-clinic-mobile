import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  WorkdayRequiredSheet,
  type WorkdayRequiredSheetRef
} from "../../../mobile/components/workday/WorkdayRequiredSheet";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useDesignSystem } from "../../hooks/useDesignSystem";
import { FAB_RISE_ABOVE_BAR, FAB_SIZE, TAB_BAR_CONTENT_HEIGHT } from "../../theme/tabBar";
import { useGpsWorkGuard } from "../../hooks/useGpsWorkGuard";
import { useActiveWorkday } from "../../hooks/useActiveWorkday";
import { useTracking } from "../../storage/TrackingContext";
import { useSyncStore } from "../../../mobile/lib/store/syncStore";
import { useI18n } from "../../i18n/I18nContext";

const TAB_ICON_SIZE = 22;
const FAB_ICON_SIZE = 24;

const TAB_LABEL_KEYS: Record<string, string> = {
  Home: "tabs.home",
  Farmers: "tabs.farmers",
  Visits: "tabs.visits",
  Profile: "tabs.profile"
};

const TAB_ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; solid: keyof typeof Ionicons.glyphMap }> = {
  Home: { outline: "home-outline", solid: "home" },
  Farmers: { outline: "people-outline", solid: "people" },
  Visits: { outline: "clipboard-outline", solid: "clipboard" },
  Profile: { outline: "person-circle-outline", solid: "person-circle" }
};

export function BottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useDesignSystem();
  const { t } = useI18n();
  const insets = useSafeAreaInsetsCompat();
  const safeBottom = Math.max(insets.bottom, 0);
  const { canRunWorkAction } = useGpsWorkGuard();
  const { isActive } = useActiveWorkday();
  const { startDay, busy } = useTracking();
  const pendingVisitsCount = useSyncStore((state) => state.pendingVisitsCount);
  const unreadNotifCount = useSyncStore((state) => state.unreadNotifCount);
  const workdaySheetRef = useRef<WorkdayRequiredSheetRef>(null);

  const navigateToNewVisit = useCallback(() => {
    navigation.getParent()?.navigate("VisitFlow", { screen: "NewVisitFarmer", params: { fresh: true } });
  }, [navigation]);

  const handleFabPress = useCallback(() => {
    if (!canRunWorkAction()) return;
    if (isActive) {
      navigateToNewVisit();
      return;
    }
    workdaySheetRef.current?.open();
  }, [canRunWorkAction, isActive, navigateToNewVisit]);

  const handleStartWorkdayFromSheet = useCallback(async () => {
    const started = await startDay();
    if (!started) return;
    workdaySheetRef.current?.close();
    navigateToNewVisit();
  }, [navigateToNewVisit, startDay]);

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
                  accessibilityLabel={t("tabs.newVisit")}
                  onPress={handleFabPress}
                  style={({ pressed }) => [styles.fabWrap, pressed && styles.fabPressed]}
                >
                  <View style={[styles.fab, { backgroundColor: colors.fab }, shadows.fab]}>
                    <Ionicons name="add" size={FAB_ICON_SIZE} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.fabLabel, { color: colors.primary }]}>{t("tabs.newVisit")}</Text>
                </Pressable>
              </View>
            );
          }

          const index = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === index;
          const labelKey = TAB_LABEL_KEYS[route.name];
          const label = labelKey ? t(labelKey) : route.name;
          const icons = TAB_ICONS[route.name];
          const color = focused ? colors.primary : colors.muted;
          const showVisitsBadge = route.name === "Visits" && pendingVisitsCount > 0;
          const showHomeNotifDot = route.name === "Home" && unreadNotifCount > 0;

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
                {showVisitsBadge ? (
                  <View style={[styles.tabBadge, { backgroundColor: colors.danger ?? "#EF4444" }]}>
                    <Text style={styles.tabBadgeText}>
                      {pendingVisitsCount > 99 ? "99+" : pendingVisitsCount}
                    </Text>
                  </View>
                ) : null}
                {showHomeNotifDot ? (
                  <View style={[styles.tabDot, { backgroundColor: colors.danger ?? "#EF4444" }]} />
                ) : null}
              </View>
              <Text style={[styles.label, { color, fontWeight: focused ? "800" : "600" }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <WorkdayRequiredSheet
        ref={workdaySheetRef}
        busy={busy}
        onStart={handleStartWorkdayFromSheet}
      />
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
    position: "relative",
    width: 32
  },
  tabBadge: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 4,
    position: "absolute",
    right: -6,
    top: -4
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12
  },
  tabDot: {
    borderRadius: 4,
    height: 8,
    position: "absolute",
    right: -2,
    top: -2,
    width: 8
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
    transform: [{ scale: 0.94 }]
  },
  label: {
    fontSize: 10,
    textAlign: "center"
  }
});
