import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { Farmer } from "../../../src/api/farmers";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useMasterData } from "../../../src/storage/MasterDataContext";
import { loadRevisitPrefill } from "../../../src/utils/farmerPrefill";
import { useVisitFormStore } from "../../store/visitFormStore";
import VisitCreateStep, { VisitCreateStep2, VisitCreateStep3 } from "./create";

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

    void loadRevisitPrefill(stub, { districts, villages })
      .then((loaded) => {
        applyRevisitPrefill(loaded);
        setStep(2);
        navigation.setParams({ fastRevisit: undefined });
      })
      .catch(() => {
        fastRevisitStarted.current = false;
      });
  }, [
    applyRevisitPrefill,
    districts,
    navigation,
    route.params?.fastRevisit,
    route.params?.prefill,
    setStep,
    villages
  ]);

  function closeFlow() {
    reset();
    navigation.goBack();
  }

  return (
    <View style={[styles.shell, { paddingTop: safeTop }]}>
      {step === 1 ? <VisitCreateStep onClose={closeFlow} /> : null}
      {step === 2 ? <VisitCreateStep2 onBack={() => setStep(1)} /> : null}
      {step === 3 ? (
        <VisitCreateStep3 onBack={() => setStep(2)} onEditStep2={() => setStep(2)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1
  }
});
