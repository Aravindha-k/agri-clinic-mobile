import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";
import type { Farmer } from "../../../src/api/farmers";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { loadRevisitPrefill } from "../../../src/utils/farmerPrefill";
import { requestGpsForFieldWork } from "../../../src/utils/locationRequiredModal";
import { ScreenCanvas, ScreenEntranceWash } from "../../components/layout";
import { VisitEntranceProvider } from "../../context/VisitEntranceContext";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { useVisitFormStore } from "../../store/visitFormStore";
import VisitCreateStep, { VisitCreateStep2, VisitCreateStep3, VisitCreateStep4 } from "./create";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function VisitFlowShell() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const { districts, villages } = useMasterData();
  const step = useVisitFormStore((s) => s.step);
  const setStep = useVisitFormStore((s) => s.setStep);
  const applyRevisitPrefill = useVisitFormStore((s) => s.applyRevisitPrefill);
  const reset = useVisitFormStore((s) => s.reset);
  const fastRevisitStarted = useRef(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const [displayedStep, setDisplayedStep] = useState(step);
  const prevStep = useRef(step);

  useEffect(() => {
    if (step === prevStep.current) return;
    const dir = step > prevStep.current ? 1 : -1;
    prevStep.current = step;

    Animated.timing(slideAnim, {
      toValue: -dir * SCREEN_WIDTH,
      duration: 280,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setDisplayedStep(step);
      slideAnim.setValue(dir * SCREEN_WIDTH);
      Animated.spring(slideAnim, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: true }).start();
    });
  }, [slideAnim, step]);

  useEffect(() => {
    if (route.params?.fresh) {
      reset();
      navigation.setParams({ fresh: undefined, prefill: undefined });
    }
  }, [navigation, reset, route.params?.fresh]);

  useEffect(() => {
    if (!route.params?.fastRevisit || !route.params?.prefill) return;
    if (fastRevisitStarted.current) return;
    const farmerId = route.params.prefill.farmer_id?.trim();
    if (!farmerId || !/^\d+$/.test(farmerId)) return;

    fastRevisitStarted.current = true;
    const stub: Farmer = { id: Number(farmerId), name: route.params.prefill.farmer_name || "" };

    void (async () => {
      const allowed = await requestGpsForFieldWork();
      if (!allowed) {
        fastRevisitStarted.current = false;
        navigation.setParams({ fastRevisit: undefined });
        return;
      }

      try {
        const loaded = await loadRevisitPrefill(stub, { districts, villages });
        applyRevisitPrefill(loaded);
        setStep(2);
        navigation.setParams({ fastRevisit: undefined });
      } catch {
        fastRevisitStarted.current = false;
      }
    })();
  }, [
    applyRevisitPrefill,
    districts,
    navigation,
    route.params?.fastRevisit,
    route.params?.prefill,
    setStep,
    villages
  ]);

  const entranceTick = useScreenEntrance();
  const entranceKey = `${entranceTick}-${displayedStep}`;

  function closeFlow() {
    reset();
    navigation.goBack();
  }

  return (
    <View style={[styles.shell, { paddingTop: safeTop }]}>
      <ScreenCanvas />
      <ScreenEntranceWash replayKey={entranceKey} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1
  },
  stepPane: {
    flex: 1
  }
});
