import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { WorkStackParamList } from "../../../src/navigation/types";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { useSecureScreen } from "../../../src/hooks/useSecureScreen";
import { useI18n } from "../../../src/i18n/I18nContext";
import { HeaderHero, ScreenCanvas, ScreenEntranceBloom } from "../../components/layout";
import { FadeInSection, entranceStagger } from "../../components/ui/FadeInSection";
import { WorkQueuePanel } from "../../components/work/WorkQueuePanel";
import { WorkSegmentBar, type WorkSegment } from "../../components/work/WorkSegmentBar";
import { WorkVisitsPanel } from "../../components/work/WorkVisitsPanel";
import { useScreenEntrance } from "../../hooks/useScreenEntrance";
import {
  HEADER_IMAGE_POSITION,
  resolveScreenHeaderHeight,
  SCREEN_HEADER_IMAGES
} from "../../lib/screenHeaderImages";
import { Colors, Spacing } from "../../lib/theme";

type Props = NativeStackScreenProps<WorkStackParamList, "WorkHome">;

export default function WorkTabScreen({ route }: Props) {
  useSecureScreen();
  const { t } = useI18n();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const { height: screenH } = useWindowDimensions();
  const headerHeroHeight = resolveScreenHeaderHeight(screenH);
  const entranceTick = useScreenEntrance();
  const initialSegment = route.params?.segment ?? "queue";
  const [segment, setSegment] = useState<WorkSegment>(initialSegment);

  useEffect(() => {
    if (route.params?.segment) {
      setSegment(route.params.segment);
    }
  }, [route.params?.segment]);

  return (
    <View style={styles.screen}>
      <ScreenCanvas />
      <ScreenEntranceBloom replayKey={entranceTick} />
      <HeaderHero
        imageSource={SCREEN_HEADER_IMAGES.work}
        height={headerHeroHeight}
        contentPosition={HEADER_IMAGE_POSITION.work}
        title={t("work.title")}
        subtitle={segment === "queue" ? t("work.farmersListSubtitle") : undefined}
        showLogo
        safeTop={safeTop}
      />
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
  body: {
    flex: 1,
    marginTop: Spacing.md,
    minHeight: 0
  }
});
