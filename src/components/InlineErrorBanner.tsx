import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";

export function InlineErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
      <Text style={styles.text} numberOfLines={3}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: space.sm,
    marginBottom: space.md,
    padding: space.md
  },
  text: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18
  },
  retry: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  }
});
