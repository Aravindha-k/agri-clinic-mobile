import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  WorkdayRequiredSheet,
  type WorkdayRequiredSheetRef
} from "../../../mobile/components/workday/WorkdayRequiredSheet";
import { useGpsWorkGuard } from "../../hooks/useGpsWorkGuard";
import { useActiveWorkday } from "../../hooks/useActiveWorkday";
import { useTracking } from "../../storage/TrackingContext";
import { DS } from "../../theme/globalStyles";
import { FAB_RISE_ABOVE_BAR, FAB_SIZE } from "../../theme/tabBar";

export function VisitFabTabButton({ accessibilityState, style }: BottomTabBarButtonProps) {
  const navigation = useNavigation<any>();
  const { canRunWorkAction } = useGpsWorkGuard();
  const { isActive } = useActiveWorkday();
  const { startDay, busy } = useTracking();
  const workdaySheetRef = useRef<WorkdayRequiredSheetRef>(null);

  const navigateToNewVisit = useCallback(() => {
    navigation.getParent()?.navigate("VisitFlow", {
      screen: "NewVisitFarmer",
      params: { fresh: true }
    });
  }, [navigation]);

  const handlePress = useCallback(() => {
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
    <>
      <View style={[styles.slot, style]} accessibilityState={accessibilityState}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          onPress={handlePress}
          style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
        >
          <View style={styles.fab}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
        </Pressable>
      </View>
      <WorkdayRequiredSheet ref={workdaySheetRef} busy={busy} onStart={handleStartWorkdayFromSheet} />
    </>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    maxWidth: FAB_SIZE + 24,
    paddingBottom: 2
  },
  wrap: {
    alignItems: "center",
    marginTop: -FAB_RISE_ABOVE_BAR
  },
  fab: {
    alignItems: "center",
    backgroundColor: DS.accent,
    borderRadius: FAB_SIZE / 2,
    elevation: 4,
    height: FAB_SIZE,
    justifyContent: "center",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    width: FAB_SIZE
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.94 }]
  }
});
