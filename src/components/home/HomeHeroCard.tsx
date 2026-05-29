import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BRAND, LOGO_IMAGE } from "../../brand/constants";
import { ProfileAvatar } from "../ProfileAvatar";
import { FieldWeather } from "../../hooks/useFieldWeather";
import { useLiveClock } from "../../hooks/useLiveClock";
import { useSafeAreaInsetsCompat } from "../../hooks/useSafeAreaInsetsCompat";
import { useTheme } from "../../theme";

const LOGO_SIZE = 38;
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
  onPress,
  disabled
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <Ionicons name={icon} size={13} color="rgba(255,255,255,0.92)" />
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.chip, pressed && !disabled && styles.chipPressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.chip}>{inner}</View>;
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
  onRetryWeather,
  right
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsetsCompat();
  const { time, dateShort } = useLiveClock();

  const weatherShort =
    weather?.label ??
    (weatherError ? "Retry" : weatherLoading ? "…" : "Weather");
  const weatherMain = weather ? `${weather.tempC}°` : weatherLoading ? "—" : "—";

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 10,
          backgroundColor: c.primaryGradientStart
        }
      ]}
    >
      <View style={[styles.gradientLayer, { backgroundColor: c.primaryGradientEnd }]} />
      <View style={styles.patternLayer} pointerEvents="none">
        <Ionicons name="leaf-outline" size={120} color="rgba(255,255,255,0.06)" style={styles.patternLeafA} />
        <Ionicons name="leaf" size={64} color="rgba(255,255,255,0.05)" style={styles.patternLeafB} />
      </View>

      {right ? <View style={styles.syncSlot}>{right}</View> : null}

      <View style={styles.topRow}>
        <View style={styles.brandCol}>
          {LOGO_IMAGE ? (
            <Image source={LOGO_IMAGE} style={styles.logoImg} resizeMode="contain" accessibilityLabel="Clinic logo" />
          ) : (
            <View style={styles.logoFallback}>
              <Ionicons name="leaf" size={20} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.clinicName} numberOfLines={1} ellipsizeMode="tail">
            {BRAND.appName}
          </Text>
        </View>

        <View style={styles.employeeCol}>
          <View style={styles.avatarShadow}>
            <ProfileAvatar
              name={displayName}
              photoUrl={employeePhotoUrl}
              photoVersion={employeePhotoVersion}
              size="sm"
              variant="onPrimary"
            />
          </View>
          <View style={styles.employeeText}>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting}
            </Text>
            <Text style={styles.employeeName} numberOfLines={1} ellipsizeMode="tail">
              {displayName || "Field employee"}
            </Text>
            <Text style={styles.role} numberOfLines={1} ellipsizeMode="tail">
              {formatRole(roleLabel)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.chipFlex}>
          <MetaChip icon="calendar-outline" label={dateShort} />
        </View>
        <View style={styles.chipFlex}>
          <MetaChip icon="time-outline" label={time} />
        </View>
        <View style={styles.chipFlex}>
          {weatherLoading && !weather ? (
            <View style={[styles.chip, styles.chipCenter]}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <MetaChip
              icon={iconName}
              label={`${weatherMain} · ${weatherShort}`}
              onPress={weatherError ? onRetryWeather : undefined}
              disabled={!weatherError}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: "hidden",
    paddingBottom: 20,
    paddingHorizontal: H_PAD
  },
  gradientLayer: {
    bottom: 0,
    left: 0,
    opacity: 0.45,
    position: "absolute",
    right: 0,
    top: "35%"
  },
  patternLayer: {
    ...StyleSheet.absoluteFillObject
  },
  patternLeafA: {
    position: "absolute",
    right: -28,
    top: 8
  },
  patternLeafB: {
    left: -12,
    position: "absolute",
    top: 48
  },
  syncSlot: {
    alignItems: "flex-end",
    marginBottom: 6,
    zIndex: 2
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    zIndex: 1
  },
  brandCol: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
    paddingRight: 4
  },
  logoImg: {
    height: LOGO_SIZE,
    width: LOGO_SIZE
  },
  logoFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    height: LOGO_SIZE,
    justifyContent: "center",
    width: LOGO_SIZE
  },
  clinicName: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 18
  },
  employeeCol: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
    maxWidth: "50%"
  },
  avatarShadow: {
    borderRadius: 22,
    elevation: 5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4
  },
  employeeText: {
    alignItems: "flex-end",
    flex: 1,
    minWidth: 0
  },
  greeting: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14
  },
  employeeName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 18,
    marginTop: 1
  },
  role: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
    marginTop: 1
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    zIndex: 1
  },
  chipFlex: {
    flex: 1,
    minWidth: 0
  },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  chipCenter: {
    justifyContent: "center"
  },
  chipPressed: {
    opacity: 0.88
  },
  chipText: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700"
  }
});
