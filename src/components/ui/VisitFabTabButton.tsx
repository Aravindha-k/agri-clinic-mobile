import { Plus } from "lucide-react-native";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import {
  WorkdayRequiredSheet,
  type WorkdayRequiredSheetRef
} from "../../../mobile/components/workday/WorkdayRequiredSheet";
import { useI18n } from "../../i18n/I18nContext";
import { navigateToVisitFlow } from "../../navigation/navigateVisitFlow";
import { useActiveWorkday } from "../../hooks/useActiveWorkday";
import { usePremiumMotion } from "../../hooks/usePremiumMotion";
import { useTracking } from "../../storage/TrackingContext";
import { useDuty } from "../../features/duty/store/DutyContext";
import { requestGpsForFieldWork, requestVisitLocationAccess } from "../../utils/locationRequiredModal";
import { hasValidMapCoords, parseMapCoord } from "../../utils/mapCoords";
import { FAB_RISE_ABOVE_BAR, FAB_SIZE } from "../../theme/tabBar";
import { LucideGlyph } from "../../../mobile/components/ui/AppIcon";
import { Colors, FontSize, FontWeight } from "../../../mobile/lib/theme";

function GlowRing({ progress }: { progress: Animated.Value }) {
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.22, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.glowRing,
        {
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
  const { reduced } = usePremiumMotion();
  const [visitFlowOpen, setVisitFlowOpen] = useState(false);
  const { isActive } = useActiveWorkday();
  const { busy, currentLocation } = useTracking();
  const { startDuty } = useDuty();
  const workdaySheetRef = useRef<WorkdayRequiredSheetRef>(null);
  const visitGateRef = useRef(false);
  const fabRotate = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;

  const activeFix = useMemo(() => {
    const lat = parseMapCoord(currentLocation?.latitude);
    const lng = parseMapCoord(currentLocation?.longitude);
    if (lat == null || lng == null || !hasValidMapCoords(lat, lng)) {
      return null;
    }
    return { latitude: lat, longitude: lng };
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const gpsRequestOptions = useMemo(
    () => ({
      trustActiveWorkdayFix: isActive,
      activeFix
    }),
    [activeFix, isActive]
  );

  useEffect(() => {
    if (reduced) {
      glowPulse.setValue(0);
      return;
    }
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(glowPulse, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [glowPulse, reduced]);

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

  const openNewVisit = useCallback(() => {
    navigateToVisitFlow(navigation, {
      screen: "NewVisitFarmer",
      params: { fresh: true }
    });
  }, [navigation]);

  const handlePress = useCallback(() => {
    if (visitGateRef.current) return;
    visitGateRef.current = true;
    void (async () => {
      try {
        if (!isActive) {
          workdaySheetRef.current?.open();
          return;
        }

        const allowed = await requestVisitLocationAccess({
          workdayActive: true,
          ...gpsRequestOptions
        });
        if (!allowed) return;
        openNewVisit();
      } catch {
        /* GPS / navigation errors stay in-app */
      } finally {
        visitGateRef.current = false;
      }
    })();
  }, [gpsRequestOptions, isActive, openNewVisit]);

  const handleStartWorkdayFromSheet = useCallback(async () => {
    try {
      const allowed = await requestGpsForFieldWork(gpsRequestOptions);
      if (!allowed) return;
      const started = await startDuty();
      if (!started) return;
      workdaySheetRef.current?.close();
      openNewVisit();
    } catch {
      /* keep sheet open for retry */
    }
  }, [gpsRequestOptions, openNewVisit, startDuty]);

  const label = t("tabs.visitShort");
  const a11yLabel = accessibilityLabel ?? t("tabs.newVisit");

  const onPressIn = () => {
    if (reduced) return;
    Animated.spring(pressScale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };

  const onPressOut = () => {
    if (reduced) {
      pressScale.setValue(1);
      return;
    }
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 22, bounciness: 6 }).start();
  };

  return (
    <>
      <View style={[styles.root, style]} accessibilityState={accessibilityState} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11yLabel}
          accessibilityHint={t("a11y.openNewVisitHint")}
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
                transform: [{ scale: pressScale }]
              }
            ]}
          >
            <GlowRing progress={glowPulse} />
            <View style={styles.outerRing} />
            <Animated.View style={[styles.fabWrap, { transform: [{ rotate: spin }] }]}>
              <LinearGradient
                colors={["#3CB878", "#1F7A4F", "#0F5C3A"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.fab}
              >
                <LucideGlyph icon={Plus} size={26} color={Colors.surface} strokeWidth={2.5} />
              </LinearGradient>
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
    width: FAB_SIZE + 28
  },
  dock: {
    alignItems: "center",
    height: FAB_SIZE + 10,
    justifyContent: "center",
    marginBottom: 4,
    width: FAB_SIZE + 10
  },
  glowRing: {
    borderColor: "rgba(46, 155, 100, 0.35)",
    borderRadius: FAB_SIZE,
    borderWidth: 1.5,
    height: FAB_SIZE + 10,
    position: "absolute",
    width: FAB_SIZE + 10
  },
  outerRing: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: (FAB_SIZE + 8) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: FAB_SIZE + 8,
    position: "absolute",
    shadowColor: "#0B3D28",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    width: FAB_SIZE + 8
  },
  fabWrap: {
    borderRadius: FAB_SIZE / 2,
    elevation: 10,
    shadowColor: "#0B3D28",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12
  },
  fab: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: FAB_SIZE / 2,
    borderWidth: 1.5,
    height: FAB_SIZE,
    justifyContent: "center",
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
