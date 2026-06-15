import { Platform, type ViewStyle } from "react-native";

/** Enterprise SaaS palette — light surfaces, green reserved for primary CTAs. */
export const ENT = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  primary: "#0F6B43",
  primarySoft: "#ECFDF5",
  primaryMuted: "#D1FAE5",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  info: "#2563EB",
  infoSoft: "#EFF6FF",
  white: "#FFFFFF",
  headerGreen: "#0F6B43"
} as const;

export const ENT_SECTION_LABEL = {
  color: ENT.textSecondary,
  fontFamily: "Inter_700Bold",
  fontSize: 10,
  fontWeight: "700" as const,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
  marginBottom: 8
};

export const ENT_CARD_SHADOW: ViewStyle = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8
  },
  android: { elevation: 2 },
  default: {}
}) ?? {};
