import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Platform } from "react-native";
import type { DashboardData } from "../../lib/types";
import { Grid, PremiumRadius } from "../../lib/designSystem";
import { TodayGradients, TodaySectionGap, TodaySurfaces } from "../../lib/todaySurfaces";
import { PremiumShadow } from "../../lib/designSystem";
import { CircularProgressRing } from "../ui/CircularProgressRing";
import { FadeInSection, entranceStagger, type ScreenEntranceProps } from "../ui/FadeInSection";
import { TodayWeatherWidget } from "./TodayWeatherWidget";
import type { FieldWeather } from "../../../src/hooks/useFieldWeather";

type Props = {
  dashboard: DashboardData | null;
  weather?: FieldWeather | null;
  weatherLoading?: boolean;
  entrance?: ScreenEntranceProps;
};

function planProgress(dashboard: DashboardData | null) {
  if (!dashboard) return { ratio: 0, completed: 0, pending: 0 };
  const completed = dashboard.visits_today;
  const pending = dashboard.follow_ups_due;
  const total = completed + pending;
  const ratio = total > 0 ? completed / total : completed > 0 ? 1 : 0;
  return { ratio, completed, pending };
}

export function TodayPlanStrip({ dashboard }: { dashboard: DashboardData | null }) {
  const { ratio, completed, pending } = planProgress(dashboard);

  return (
    <View style={[styles.planShell, TodaySurfaces.plan, PremiumShadow.card]}>
      <LinearGradient
        colors={[...TodayGradients.plan]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {Platform.OS === "ios" ? (
        <BlurView intensity={12} tint="light" style={StyleSheet.absoluteFill} />
      ) : null}
      <CircularProgressRing
        progress={ratio}
        label="Today's plan"
        subtitle={`${completed} done · ${pending} pending`}
        size={76}
        variant="glass"
      />
    </View>
  );
}

/** Weather + today's progress — distinct surface rhythm. */
export function TodayPlanRow({ dashboard, weather, weatherLoading, entrance }: Props) {
  const body = (
    <View style={styles.row}>
      <TodayWeatherWidget weather={weather} loading={weatherLoading} />
      <TodayPlanStrip dashboard={dashboard} />
    </View>
  );

  if (!entrance) return body;
  return (
    <FadeInSection replayKey={entrance.replayKey} delay={entranceStagger(entrance.sectionStep)} variant="card">
      {body}
    </FadeInSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Grid.sm,
    marginTop: TodaySectionGap,
    paddingHorizontal: Grid.md
  },
  planShell: {
    flex: 1,
    minHeight: 156,
    overflow: "hidden"
  }
});
