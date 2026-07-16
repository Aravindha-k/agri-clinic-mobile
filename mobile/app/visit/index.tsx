import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Dimensions, Easing, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Farmer } from "../../../src/api/farmers";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useI18n } from "../../../src/i18n/I18nContext";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { useTracking } from "../../../src/storage/TrackingContext";
import { useDuty } from "../../../src/features/duty/store/DutyContext";
import { loadRevisitPrefill } from "../../../src/utils/farmerPrefill";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import {
  WorkdayRequiredSheet,
  type WorkdayRequiredSheetRef
} from "../../components/workday/WorkdayRequiredSheet";
import { ScreenCanvas, ScreenEntranceBloom } from "../../components/layout";
import { VisitEntranceProvider } from "../../context/VisitEntranceContext";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { beginNewVisit } from "../../lib/beginNewVisit";
import { isVisitSubmitInFlight } from "../../lib/visit/visitSubmitCoordinator";
import { useVisitFormStore } from "../../store/visitFormStore";
import VisitCreateStep, { VisitCreateStep2, VisitCreateStep3, VisitCreateStep4 } from "./create";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function VisitFlowShell() {
  useSecureScreen();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { districts, villages } = useMasterData();
  const { busy: workdayBusy } = useTracking();
  const { currentDuty, startDuty } = useDuty();
  const workdaySheetRef = useRef<WorkdayRequiredSheetRef>(null);
  const dutyGateShown = useRef(false);
  const step = useVisitFormStore((s) => s.step);
  const setStep = useVisitFormStore((s) => s.setStep);
  const applyRevisitPrefill = useVisitFormStore((s) => s.applyRevisitPrefill);
  const fastRevisitStarted = useRef(false);
  const guardDialogOpen = useRef(false);
  const allowRemoval = useRef(false);
  const draftState = useVisitFormStore();
  const hasDraft = draftState.hasFormData();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const [displayedStep, setDisplayedStep] = useState(step);
  const prevStep = useRef(step);

  useEffect(() => {
    if (step === prevStep.current) return;
    const dir = step > prevStep.current ? 1 : -1;
    prevStep.current = step;

    Animated.timing(slideAnim, {
      toValue: -dir * SCREEN_WIDTH,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(() => {
      setDisplayedStep(step);
      slideAnim.setValue(dir * SCREEN_WIDTH);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    });
  }, [slideAnim, step]);

  useEffect(() => {
    let active = true;
    void Promise.resolve(useVisitFormStore.persist.rehydrate()).then(() => {
      if (!active || !route.params?.fresh) return;
      const prefill = route.params.prefill;
      beginNewVisit(prefill ? { farmerPrefill: prefill, step: 2 } : undefined);
      navigation.setParams({ fresh: undefined, prefill: undefined });
    });
    return () => {
      active = false;
    };
  }, [navigation, route.params?.fresh, route.params?.prefill]);

  useEffect(() => {
    if (!route.params?.fastRevisit || !route.params?.prefill) return;
    if (fastRevisitStarted.current) return;
    const farmerId = route.params.prefill.farmer_id?.trim();
    if (!farmerId || !/^\d+$/.test(farmerId)) return;

    fastRevisitStarted.current = true;
    const stub: Farmer = { id: Number(farmerId), name: route.params.prefill.farmer_name || "" };

    void (async () => {
      if (!currentDuty?.is_active) {
        const started = await startDuty();
        if (!started) {
          fastRevisitStarted.current = false;
          navigation.setParams({ fastRevisit: undefined });
          navigation.goBack();
          return;
        }
      }

      const allowed = await requestGpsForFieldWork();
      if (!allowed) {
        fastRevisitStarted.current = false;
        navigation.setParams({ fastRevisit: undefined });
        Alert.alert(t("visitFlow.revisitGpsTitle"), t("visitFlow.revisitGpsBody"), [
          { text: t("common.cancel"), style: "cancel", onPress: () => navigation.goBack() }
        ]);
        return;
      }

      try {
        const loaded = await loadRevisitPrefill(stub, { districts, villages });
        applyRevisitPrefill(loaded);
        setStep(2);
        navigation.setParams({ fastRevisit: undefined });
      } catch {
        fastRevisitStarted.current = false;
        Alert.alert(t("visitFlow.revisitPrefillTitle"), t("visitFlow.revisitPrefillBody"), [
          {
            text: t("common.retry"),
            onPress: () => {
              fastRevisitStarted.current = false;
              navigation.setParams({ fastRevisit: true });
            }
          },
          { text: t("common.cancel"), style: "cancel", onPress: () => navigation.goBack() }
        ]);
      }
    })();
  }, [
    applyRevisitPrefill,
    districts,
    navigation,
    route.params?.fastRevisit,
    route.params?.prefill,
    setStep,
    t,
    villages,
    currentDuty?.is_active,
    startDuty
  ]);

  useEffect(() => {
    if (currentDuty?.is_active || dutyGateShown.current || route.params?.fastRevisit) return;
    dutyGateShown.current = true;
    workdaySheetRef.current?.open();
  }, [currentDuty?.is_active, route.params?.fastRevisit]);

  const entranceTick = useScreenEntrance();
  const entranceKey = `${entranceTick}-${displayedStep}`;

  useEffect(
    () =>
      navigation.addListener("beforeRemove", (event: any) => {
        if (isVisitSubmitInFlight()) {
          event.preventDefault();
          return;
        }
        if (!hasDraft || allowRemoval.current) return;
        event.preventDefault();
        if (guardDialogOpen.current) return;
        guardDialogOpen.current = true;
        Alert.alert(t("visitFlow.leaveVisitTitle"), t("visitFlow.leaveVisitBody"), [
          {
            text: t("visitFlow.continueEditing"),
            style: "cancel",
            onPress: () => {
              guardDialogOpen.current = false;
            }
          },
          {
            text: t("visitFlow.saveDraft"),
            onPress: () => {
              guardDialogOpen.current = false;
              allowRemoval.current = true;
              navigation.dispatch(event.data.action);
            }
          },
          {
            text: t("visitFlow.discard"),
            style: "destructive",
            onPress: () => {
              guardDialogOpen.current = false;
              allowRemoval.current = true;
              beginNewVisit({ discardMedia: true });
              navigation.dispatch(event.data.action);
            }
          }
        ]);
      }),
    [hasDraft, navigation, t]
  );

  function closeFlow() {
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.shell} edges={["top"]}>
      <ScreenCanvas />
      <ScreenEntranceBloom replayKey={entranceKey} />
      <VisitEntranceProvider replayKey={entranceKey}>
        <Animated.View style={[styles.stepPane, { transform: [{ translateX: slideAnim }] }]}>
          {displayedStep === 1 ? <VisitCreateStep onClose={closeFlow} /> : null}
          {displayedStep === 2 ? <VisitCreateStep2 onBack={() => setStep(1)} /> : null}
          {displayedStep === 3 ? (
            <VisitCreateStep3 onBack={() => setStep(2)} />
          ) : null}
          {displayedStep === 4 ? (
            <VisitCreateStep4
              onBack={() => setStep(3)}
              onEditStep1={() => setStep(1)}
              onEditStep2={() => setStep(2)}
              onEditStep3={() => setStep(3)}
            />
          ) : null}
        </Animated.View>
      </VisitEntranceProvider>
      <WorkdayRequiredSheet
        ref={workdaySheetRef}
        busy={workdayBusy}
        onStart={async () => {
          const started = await startDuty();
          if (started) {
            workdaySheetRef.current?.close();
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    overflow: "hidden"
  },
  stepPane: {
    flex: 1,
    minHeight: 0
  }
});
