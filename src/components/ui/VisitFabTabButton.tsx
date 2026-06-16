import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import {
  WorkdayRequiredSheet,
  type WorkdayRequiredSheetRef
} from "../../../mobile/components/workday/WorkdayRequiredSheet";
import { useI18n } from "../../i18n/I18nContext";
import { navigateToVisitFlow } from "../../navigation/navigateVisitFlow";
import { useActiveWorkday } from "../../hooks/useActiveWorkday";
import { useTracking } from "../../storage/TrackingContext";
import { requestGpsForFieldWork } from "../../utils/locationRequiredModal";
import { FAB_HALO_SIZE, FAB_RISE_ABOVE_BAR, FAB_SIZE } from "../../theme/tabBar";
import { Colors, FontSize, FontWeight } from "../../../mobile/lib/theme";

function RippleRing({ progress, color }: { progress: Animated.Value; color: string }) {
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.42] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.28, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ripple,
        {
          borderColor: color,
          opacity,
          transform: [{ scale }]
        }
      ]}
    />
  );
}

export function VisitFabTabButton({
  accessibilityState,
  accessibilityLabel,
  style
}: BottomTabBarButtonProps) {
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const [visitFlowOpen, setVisitFlowOpen] = useState(false);
  const { isActive } = useActiveWorkday();
  const { startDay, busy } = useTracking();
  const workdaySheetRef = useRef<WorkdayRequiredSheetRef>(null);
  const fabRotate = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const plusPulse = useRef(new Animated.Value(1)).current;
  const rippleA = useRef(new Animated.Value(0)).current;
  const rippleB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1.04,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    const plusLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(plusPulse, {
          toValue: 1.06,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(plusPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    const rippleLoop = (value: Animated.Value, delayMs: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(value, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      );

    breatheLoop.start();
    plusLoop.start();
    rippleLoop(rippleA, 0).start();
    rippleLoop(rippleB, 1000).start();

    return () => {
      breatheLoop.stop();
      plusLoop.stop();
      rippleA.stopAnimation();
      rippleB.stopAnimation();
    };
  }, [breathe, plusPulse, rippleA, rippleB]);

  useEffect(() => {
    type NavLike = {
      addListener?: (event: string, cb: () => void) => () => void;
      getState?: () => { index?: number; routes?: Array<{ name?: string }> };
      getParent?: () => NavLike | undefined;
    };

    let nav: NavLike | undefined = navigation;
    const unsubs: Array<() => void> = [];

    const attach = (n: NavLike | undefined) => {
      if (!n?.addListener) return;
      const sync = () => {
        const state = n.getState?.();
        const route = state?.routes?.[state.index ?? 0];
        setVisitFlowOpen(route?.name === "VisitFlow");
      };
      sync();
      unsubs.push(n.addListener("state", sync));
    };

    attach(nav);
    let parent = nav?.getParent?.();
    while (parent) {
      attach(parent);
      parent = parent.getParent?.();
    }

    return () => {
      unsubs.forEach((off) => off());
    };
  }, [navigation]);

  useEffect(() => {
    Animated.timing(fabRotate, {
      toValue: visitFlowOpen ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [fabRotate, visitFlowOpen]);

  const spin = fabRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });
  const dockScale = Animated.multiply(breathe, pressScale);

  const openNewVisit = useCallback(() => {
    navigateToVisitFlow(navigation, {
      screen: "NewVisitFarmer",
      params: { fresh: true }
    });
  }, [navigation]);

  const handlePress = useCallback(() => {
    void (async () => {
      const allowed = await requestGpsForFieldWork();
      if (!allowed) return;
      if (isActive) {
        openNewVisit();
        return;
      }
      workdaySheetRef.current?.open();
    })();
  }, [isActive, openNewVisit]);

  const handleStartWorkdayFromSheet = useCallback(async () => {
    const allowed = await requestGpsForFieldWork();
    if (!allowed) return;
    const started = await startDay();
    if (!started) return;
    workdaySheetRef.current?.close();
    openNewVisit();
  }, [openNewVisit, startDay]);

  const label = t("tabs.visitShort");
  const a11yLabel = accessibilityLabel ?? t("tabs.newVisit");

  const onPressIn = () => {
    Animated.spring(pressScale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };

  const onPressOut = () => {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 5 }).start();
  };

  return (
    <>
      <View style={[styles.root, style]} accessibilityState={accessibilityState} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityState={accessibilityState}
          hitSlop={{ top: 12, bottom: 8, left: 14, right: 14 }}
          onPress={handlePress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={styles.pressable}
        >
          <Animated.View
            style={[
              styles.dock,
              {
                marginTop: -FAB_RISE_ABOVE_BAR,
                transform: [{ scale: dockScale }]
              }
            ]}
          >
            <RippleRing progress={rippleA} color={Colors.brand700} />
            <RippleRing progress={rippleB} color={Colors.brand500} />
            <View style={styles.halo}>
              <View style={styles.haloInner} />
            </View>
            <Animated.View style={[styles.fab, { transform: [{ rotate: spin }] }]}>
              <Animated.View style={{ transform: [{ scale: plusPulse }] }}>
                <Ionicons name="add" size={28} color={Colors.surface} />
              </Animated.View>
            </Animated.View>
          </Animated.View>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      </View>
      <WorkdayRequiredSheet ref={workdaySheetRef} busy={busy} onStart={handleStartWorkdayFromSheet} />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    overflow: "visible",
    paddingBottom: 2
  },
  pressable: {
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 50,
    width: FAB_HALO_SIZE + 16
  },
  dock: {
    alignItems: "center",
    height: FAB_HALO_SIZE + 8,
    justifyContent: "center",
    marginBottom: 3,
    width: FAB_HALO_SIZE + 8
  },
  ripple: {
    borderRadius: FAB_HALO_SIZE,
    borderWidth: 2,
    height: FAB_HALO_SIZE,
    position: "absolute",
    width: FAB_HALO_SIZE
  },
  halo: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.brand100,
    borderRadius: FAB_HALO_SIZE / 2,
    borderWidth: 2,
    elevation: 4,
    height: FAB_HALO_SIZE,
    justifyContent: "center",
    position: "absolute",
    shadowColor: "#0F5132",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    width: FAB_HALO_SIZE
  },
  haloInner: {
    backgroundColor: Colors.brand50,
    borderRadius: (FAB_HALO_SIZE - 8) / 2,
    height: FAB_HALO_SIZE - 8,
    width: FAB_HALO_SIZE - 8
  },
  fab: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderColor: Colors.surface,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    elevation: 10,
    height: FAB_SIZE,
    justifyContent: "center",
    shadowColor: "#0F5132",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    width: FAB_SIZE
  },
  label: {
    color: Colors.brand700,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
    textAlign: "center"
  }
});
