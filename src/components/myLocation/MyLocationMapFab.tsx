import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { Colors, Radius, Shadow, Spacing } from "../../../mobile/lib/theme";

type Props = {
  onLocateMe: () => void;
  onFitRoute: () => void;
  onNavigate: () => void;
};

export const MyLocationMapFab = memo(function MyLocationMapFab({
  onLocateMe,
  onFitRoute,
  onNavigate
}: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <Fab icon="locate" label={t("myLocation.locateMe")} onPress={onLocateMe} />
      <Fab icon="scan-outline" label={t("myLocation.fitRoute")} onPress={onFitRoute} />
      <Fab icon="navigate" label={t("myLocation.navigate")} onPress={onNavigate} primary />
    </View>
  );
});

function Fab({
  icon,
  label,
  onPress,
  primary = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        pressed && { opacity: 0.9 }
      ]}
    >
      <Ionicons color={primary ? Colors.surface : Colors.brand700} name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md
  },
  btn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...Shadow.card
  },
  btnPrimary: {
    backgroundColor: Colors.brand700,
    borderColor: Colors.brand700
  }
});
