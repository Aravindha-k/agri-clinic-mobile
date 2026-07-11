import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { WorkStackParamList } from "../../../src/navigation/types";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useI18n } from "../../../src/i18n/I18nContext";
import { ScreenCanvas, ScreenEntranceBloom, ScreenPageHeader } from "../../components/layout";
import { WorkQueuePanel } from "../../components/work/WorkQueuePanel";
import { WorkSegmentBar, type WorkSegment } from "../../components/work/WorkSegmentBar";
import { WorkVisitsPanel } from "../../components/work/WorkVisitsPanel";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { useScreenTopEdges } from "../../hooks/useScreenTopEdges";
import { Colors } from "../../lib/theme";

type Props = NativeStackScreenProps<WorkStackParamList, "WorkHome">;

export default function WorkTabScreen({ route }: Props) {
  useSecureScreen();
  const { t } = useI18n();
  const topEdges = useScreenTopEdges();
  const entranceTick = useScreenEntrance();
  const initialSegment = route.params?.segment ?? "queue";
  const [segment, setSegment] = useState<WorkSegment>(initialSegment);

  useEffect(() => {
    if (route.params?.segment) {
      setSegment(route.params.segment);
    }
  }, [route.params?.segment]);

  const onSegmentChange = useCallback((next: WorkSegment) => {
    setSegment(next);
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={topEdges}>
      <ScreenCanvas />
      <ScreenEntranceBloom replayKey={entranceTick} />
      <ScreenPageHeader
        title={t("work.title")}
        subtitle={t("work.farmersListSubtitle")}
      />
      <WorkSegmentBar
        segment={segment}
        queueLabel={t("work.farmersList")}
        visitsLabel={t("work.visits")}
        onChange={onSegmentChange}
      />

      <View style={styles.panel}>
        {segment === "queue" ? (
          <WorkQueuePanel entranceTick={`${entranceTick}-queue`} entranceStep={2} />
        ) : (
          <WorkVisitsPanel active entranceTick={`${entranceTick}-visits`} entranceStep={2} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  panel: {
    flex: 1,
    minHeight: 0
  }
});
