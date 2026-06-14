import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ClinicCard } from "../brand/ClinicCard";
import { StitchAppBar } from "../stitch/StitchAppBar";
import { ProfileAvatar } from "../ProfileAvatar";
import { FieldWeather } from "../../hooks/useFieldWeather";
import { useLiveClock } from "../../hooks/useLiveClock";
import { formatDisplayRole } from "../../utils/formatRole";
import { useTheme } from "../../theme";
import { Ionicons } from "@expo/vector-icons";

const H_PAD = 16;

type Props = {
  greeting: string;
  displayName: string;
  roleLabel: string;
  employeePhotoUrl?: string | null;
  employeePhotoVersion?: string | number | null;
  weather: FieldWeather | null;
  weatherLoading: boolean;
  weatherError?: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  onRetryWeather?: () => void;
  right?: ReactNode;
};

function MetaChip({
  icon,
  label,
  tint
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: { primary: string; primarySoft: string; text: string; border: string };
}) {
  return (
    <View style={[styles.chip, { backgroundColor: tint.primarySoft, borderColor: tint.border }]}>
      <Ionicons name={icon} size={14} color={tint.primary} />
      <Text style={[styles.chipText, { color: tint.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function HomeHeroCard({
  greeting,
  displayName,
  roleLabel,
  employeePhotoUrl,
  employeePhotoVersion,
  weather,
  weatherLoading,
  weatherError,
  iconName,
  right
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { time, dateShort } = useLiveClock();

  const weatherShort = weather?.label ?? (weatherError ? "Retry" : weatherLoading ? "…" : "Weather");
  const weatherMain = weather ? `${weather.tempC}°` : "—";

  return (
    <View style={[styles.wrap, { backgroundColor: c.background }]}>
      <StitchAppBar mode="brand" right={right} />

      <View style={styles.pad}>
        <ClinicCard style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <ProfileAvatar
              name={displayName}
              photoUrl={employeePhotoUrl}
              photoVersion={employeePhotoVersion}
              size="lg"
            />
            <View style={styles.welcomeCopy}>
              <Text style={[styles.greeting, { color: c.muted }]}>{greeting}</Text>
              <Text style={[styles.displayName, { color: c.text }]} numberOfLines={2}>
                {displayName || "Field employee"}
              </Text>
              <View style={[styles.rolePill, { backgroundColor: c.primarySoft }]}>
                <Text style={[styles.role, { color: c.primaryDark }]} numberOfLines={1}>
                  {formatDisplayRole(roleLabel)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.chipFlex}>
              <MetaChip icon="calendar-outline" label={dateShort} tint={c} />
            </View>
            <View style={styles.chipFlex}>
              <MetaChip icon="time-outline" label={time} tint={c} />
            </View>
          </View>
          <MetaChip icon={iconName} label={`${weatherMain}° · ${weatherShort}`} tint={c} />
        </ClinicCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 4 },
  pad: { paddingHorizontal: H_PAD },
  welcomeCard: { gap: 14 },
  welcomeRow: { alignItems: "center", flexDirection: "row", gap: 14 },
  welcomeCopy: { flex: 1, gap: 4, minWidth: 0 },
  greeting: { fontSize: 13, fontWeight: "600" },
  displayName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.35, lineHeight: 26 },
  rolePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  role: { fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", gap: 8 },
  chipFlex: { flex: 1, minWidth: 0 },
  chip: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  chipText: { flexShrink: 1, fontSize: 11, fontWeight: "700" }
});
