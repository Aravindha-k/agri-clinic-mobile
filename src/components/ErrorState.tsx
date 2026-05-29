import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../hooks/useDesignSystem";
import { PrimaryButton } from "./ui/PrimaryButton";

function isLikelyOfflineMessage(message: string) {
  return /no internet|network|connection|offline|timeout|timed out|failed to fetch/i.test(message);
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors, type, spacing } = useDesignSystem();
  const offlineHint = isLikelyOfflineMessage(message);

  return (
    <View style={styles.state}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: offlineHint ? colors.warningSoft : colors.dangerSoft }
        ]}
      >
        <Ionicons
          name={offlineHint ? "cloud-offline-outline" : "alert-circle-outline"}
          size={32}
          color={offlineHint ? colors.warning : colors.danger}
        />
      </View>
      <Text style={[type.sectionTitle, styles.title]}>{offlineHint ? "Connection problem" : "Something went wrong"}</Text>
      <Text style={[type.meta, styles.message]}>{message}</Text>
      {offlineHint ? <Text style={[type.caption, styles.hint]}>Try again when you have a stable signal.</Text> : null}
      {onRetry ? (
        <PrimaryButton title="Try again" onPress={onRetry} variant="secondary" style={{ marginTop: spacing.lg, alignSelf: "stretch", maxWidth: 280 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    marginBottom: 14,
    width: 64
  },
  title: { textAlign: "center" },
  message: { marginTop: 8, textAlign: "center" },
  hint: { marginTop: 8, textAlign: "center" }
});
