import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "../../../mobile/lib/theme";

type Props = {
  onLocateMe: () => void;
  onFitRoute: () => void;
  onRefresh: () => void;
  onCompass: () => void;
  onNavigate: () => void;
  refreshing: boolean;
  compassActive: boolean;
};

export const MyLocationMapControls = memo(function MyLocationMapControls({
  onLocateMe,
  onFitRoute,
  onRefresh,
  onCompass,
  onNavigate,
  refreshing,
  compassActive
}: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.wrap}>
      <ControlButton icon="locate" label={t("myLocation.locateMe")} onPress={onLocateMe} />
      <ControlButton icon="git-branch-outline" label={t("myLocation.fitRoute")} onPress={onFitRoute} />
      <ControlButton
        icon="refresh"
        label={t("myLocation.refresh")}
        onPress={onRefresh}
        loading={refreshing}
      />
      <ControlButton
        icon="compass"
        label={t("myLocation.compass")}
        onPress={onCompass}
        active={compassActive}
      />
      <ControlButton icon="navigate" label={t("myLocation.navigate")} onPress={onNavigate} primary />
    </View>
  );
});

function ControlButton({
  icon,
  label,
  onPress,
  loading = false,
  active = false,
  primary = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
  active?: boolean;
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
        active && styles.btnActive,
        pressed && { opacity: 0.88 }
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? Colors.onPrimary : Colors.brand700} size="small" />
      ) : (
        <Ionicons color={primary ? Colors.onPrimary : Colors.brand700} name={icon} size={20} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm
  },
  btn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.button,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
    ...Shadow.card
  },
  btnPrimary: {
    backgroundColor: Colors.brand700,
    borderColor: Colors.brand700
  },
  btnActive: {
    backgroundColor: Colors.blueBg,
    borderColor: Colors.blue
  }
});
