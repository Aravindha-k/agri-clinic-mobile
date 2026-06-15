import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import {
  WorkdayRequiredSheet,
  type WorkdayRequiredSheetRef
} from "../../../mobile/components/workday/WorkdayRequiredSheet";
import { useGpsWorkGuard } from "../../hooks/useGpsWorkGuard";
import { useActiveWorkday } from "../../hooks/useActiveWorkday";
import { useTracking } from "../../storage/TrackingContext";
import { FAB_RISE_ABOVE_BAR, FAB_SIZE } from "../../theme/tabBar";
import { ENT } from "../../theme/enterprise";
import { PressableScale } from "./PressableScale";

export function VisitFabTabButton({ accessibilityState, style }: BottomTabBarButtonProps) {
  const navigation = useNavigation<any>();
  const [visitFlowOpen, setVisitFlowOpen] = useState(false);
  const { canRunWorkAction } = useGpsWorkGuard();
  const { isActive } = useActiveWorkday();
  const { startDay, busy } = useTracking();
  const workdaySheetRef = useRef<WorkdayRequiredSheetRef>(null);
  const fabRotate = useRef(new Animated.Value(0)).current;
  const fabGlowOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabGlowOpacity, {
          toValue: 0.65,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(fabGlowOpacity, {
          toValue: 0.35,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      fabGlowOpacity.stopAnimation();
    };
  }, [fabGlowOpacity]);

  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    const sync = () => {
      const root = parent.getState();
      const activeRoute = root.routes[root.index];
      setVisitFlowOpen(activeRoute?.name === "VisitFlow");
    };
    sync();
    return parent.addListener("state", sync);
  }, [navigation]);

  useEffect(() => {
    Animated.timing(fabRotate, {
      toValue: visitFlowOpen ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true
    }).start();
  }, [fabRotate, visitFlowOpen]);

  const spin = fabRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

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
        <PressableScale
          accessibilityRole="button"
          accessibilityState={accessibilityState}
          onPress={handlePress}
          style={styles.wrap}
          scaleTo={0.94}
        >
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: fabGlowOpacity
              }
            ]}
          >
            <Animated.View style={[styles.fab, { transform: [{ rotate: spin }] }]}>
              <Ionicons name="add" size={26} color={ENT.white} />
            </Animated.View>
          </Animated.View>
        </PressableScale>
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
  glowRing: {
    borderRadius: FAB_SIZE / 2,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12
  },
  fab: {
    alignItems: "center",
    backgroundColor: ENT.primary,
    borderRadius: FAB_SIZE / 2,
    height: FAB_SIZE,
    justifyContent: "center",
    width: FAB_SIZE
  }
});
