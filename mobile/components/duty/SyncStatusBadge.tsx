import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

type Props = {
  offline?: boolean;
  pendingCount?: number;
  syncing?: boolean;
};

export function SyncStatusBadge({ offline, pendingCount = 0, syncing }: Props) {
  const { t } = useI18n();

  if (syncing) {
    const label = t("home.syncing");
    return (
      <View
        style={[styles.badge, styles.syncing]}
        accessibilityRole="text"
        accessibilityLabel={label}
        accessibilityLiveRegion="polite"
      >
        <Text style={[styles.text, styles.syncingText]}>{label}</Text>
      </View>
    );
  }

  if (offline) {
    const label = t("daySummary.offline");
    return (
      <View
        style={[styles.badge, styles.offline]}
        accessibilityRole="text"
        accessibilityLabel={label}
        accessibilityLiveRegion="polite"
      >
        <Text style={[styles.text, styles.offlineText]}>{label}</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    const text = `${t("workdayUx.pendingSync")} (${pendingCount})`;
    const accessibilityLabel = t(
      pendingCount === 1 ? "a11y.syncPending_one" : "a11y.syncPending_other",
      { count: pendingCount }
    );
    return (
      <View
        style={[styles.badge, styles.pending]}
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
        accessibilityLiveRegion="polite"
      >
        <Text style={[styles.text, styles.pendingText]}>{text}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs
  },
  text: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold
  },
  offline: {
    backgroundColor: Colors.amberBg,
    borderColor: Colors.amber
  },
  offlineText: {
    color: Colors.amberText
  },
  pending: {
    backgroundColor: Colors.blueBg,
    borderColor: Colors.blue
  },
  pendingText: {
    color: Colors.blueText
  },
  syncing: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand100
  },
  syncingText: {
    color: Colors.brand700
  }
});
