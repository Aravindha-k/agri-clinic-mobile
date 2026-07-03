import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import type { FieldWeather } from "../../../src/hooks/useFieldWeather";
import { Grid, Harvest, IconSize, PremiumShadow, Typography } from "../../lib/designSystem";
import { TodayGradients, TodaySurfaces } from "../../lib/todaySurfaces";
import { FontWeight } from "../../lib/theme";
import { AnimatedWeatherScene } from "../ui/AnimatedWeatherScene";
import { AppIcon, weatherIconForCode } from "../ui/AppIcon";
import { ShimmerBlock } from "../ui/ShimmerBlock";

type Props = {
  weather?: FieldWeather | null;
  loading?: boolean;
};

function MetricPill({ icon, label, value }: { icon: "droplets" | "wind" | "cloud-rain" | "sun"; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppIcon name={icon} size={IconSize.xs} color={Harvest.sky} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

/** Premium field weather — icon, temp, conditions, metric pills. */
export function TodayWeatherWidget({ weather, loading = false }: Props) {
  const shortLabel = weather?.label?.replace(" sky", "").replace("Partly cloudy", "Partly sunny") ?? "—";

  return (
    <View style={[styles.card, TodaySurfaces.weather, PremiumShadow.card]}>
      <LinearGradient
        colors={[...TodayGradients.weather]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Text style={styles.eyebrow}>Field weather</Text>
      {loading && !weather ? (
        <View style={styles.shimmerCol}>
          <ShimmerBlock width="55%" height={36} />
          <ShimmerBlock width="70%" height={12} />
        </View>
      ) : (
        <>
          <View style={styles.heroRow}>
            <View style={styles.tempBlock}>
              <View style={styles.iconTempRow}>
                <AnimatedWeatherScene code={weather?.code ?? 1} />
                <Text style={styles.temp}>{weather ? `${weather.tempC}°` : "—"}</Text>
              </View>
              <Text style={styles.condition} numberOfLines={1}>
                {shortLabel}
              </Text>
            </View>
            {!loading && weather ? (
              <AppIcon name={weatherIconForCode(weather.code)} size={IconSize.lg} color={Harvest.sky} />
            ) : null}
          </View>
          <View style={styles.metrics}>
            <MetricPill icon="droplets" label="Humidity" value={weather?.humidity != null ? `${weather.humidity}%` : "—"} />
            <MetricPill icon="wind" label="Wind" value={weather?.windKmh != null ? `${weather.windKmh}` : "—"} />
            <MetricPill icon="cloud-rain" label="Rain" value={weather?.rainChance != null ? `${weather.rainChance}%` : "—"} />
            <MetricPill icon="sun" label="UV" value={weather?.uvIndex != null ? `${weather.uvIndex}` : "—"} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 156,
    padding: Grid.md
  },
  eyebrow: {
    ...Typography.label,
    color: Harvest.sky,
    fontSize: 11,
    textTransform: "none"
  },
  shimmerCol: {
    gap: Grid.xs,
    marginTop: Grid.sm
  },
  heroRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Grid.sm
  },
  tempBlock: {
    flex: 1,
    gap: 2
  },
  iconTempRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Grid.xs
  },
  temp: {
    ...Typography.display,
    fontSize: 34,
    fontWeight: FontWeight.bold,
    letterSpacing: -1
  },
  condition: {
    ...Typography.bodyMedium,
    color: Harvest.textSecondary,
    fontSize: 15
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Grid.xs,
    marginTop: Grid.md
  },
  metric: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 12,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 2,
    paddingHorizontal: Grid.xs,
    paddingVertical: Grid.xs
  },
  metricLabel: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 10
  },
  metricValue: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: FontWeight.semibold
  }
});
