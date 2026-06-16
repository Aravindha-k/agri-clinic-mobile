import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { WorkStackParamList } from "../../../src/navigation/types";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useI18n } from "../../../src/i18n/I18nContext";
import { ScreenCanvas, ScreenEntranceWash } from "../../components/layout";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { WorkQueuePanel } from "../../components/work/WorkQueuePanel";
import { WorkSegmentBar, type WorkSegment } from "../../components/work/WorkSegmentBar";
import { WorkVisitsPanel } from "../../components/work/WorkVisitsPanel";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = NativeStackScreenProps<WorkStackParamList, "WorkHome">;

export default function WorkTabScreen({ route }: Props) {
  useSecureScreen();
  const { t } = useI18n();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const entranceTick = useScreenEntrance();
  const initialSegment = route.params?.segment ?? "queue";
  const [segment, setSegment] = useState<WorkSegment>(initialSegment);

  useEffect(() => {
    if (route.params?.segment) {
      setSegment(route.params.segment);
    }
  }, [route.params?.segment]);

  return (
    <View style={[styles.screen, { paddingTop: safeTop }]}>
      <ScreenCanvas />
      <ScreenEntranceWash replayKey={entranceTick} />
      <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("work.title")}</Text>
          {segment === "queue" ? <Text style={styles.subtitle}>{t("work.farmersListSubtitle")}</Text> : null}
        </View>
      </FadeInSection>

      <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
        <WorkSegmentBar
          segment={segment}
          queueLabel={t("work.farmersList")}
          visitsLabel={t("work.visits")}
          onChange={setSegment}
        />
      </FadeInSection>

      <View style={styles.body}>
        {segment === "queue" ? (
          <WorkQueuePanel entranceTick={`${entranceTick}-queue`} entranceStep={2} />
        ) : (
          <WorkVisitsPanel entranceTick={`${entranceTick}-visits`} entranceStep={2} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  header: {
    gap: 2,
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  body: {
    flex: 1,
    marginTop: Spacing.md,
    minHeight: 0
  }
});
