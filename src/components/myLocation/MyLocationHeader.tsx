import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CompactScreenHeader } from "../../../mobile/components/layout/CompactScreenHeader";
import { useI18n } from "../../i18n/I18nContext";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing, minTouchStyle } from "../../../mobile/lib/theme";

type Props = {
  trackingActive: boolean;
  onBack: () => void;
  onRefresh: () => void;
  title?: string;
  subtitle?: string;
};

export const MyLocationHeader = memo(function MyLocationHeader({
  trackingActive,
  onBack,
  onRefresh,
  title,
  subtitle
}: Props) {
  const { t } = useI18n();
  const statusLabel = trackingActive
    ? t("myLocation.status.active")
    : t("myLocation.status.inactive");

  const actions = (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.retry")}
        onPress={onRefresh}
        style={styles.iconBtn}
        hitSlop={8}
      >
        <Ionicons color={Colors.text2} name="refresh-outline" size={20} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <CompactScreenHeader
        title={title ?? t("myLocation.title")}
        subtitle={subtitle ?? t("home.fieldOperations")}
        onBack={onBack}
        right={actions}
        style={styles.compact}
      />
      <View style={[styles.badge, trackingActive ? styles.badgeActive : styles.badgeIdle]}>
        <View style={[styles.badgeDot, trackingActive ? styles.dotOn : styles.dotOff]} />
        <Text style={[styles.badgeText, trackingActive ? styles.badgeTextOn : styles.badgeTextOff]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm
  },
  compact: {
    paddingBottom: 0
  },
  actions: {
    flexDirection: "row"
  },
  iconBtn: {
    ...minTouchStyle,
    alignItems: "center",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.inner,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    ...Shadow.card
  },
  badge: {
    alignSelf: "center",
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6
  },
  badgeActive: {
    backgroundColor: Colors.greenBg,
    borderColor: Colors.green
  },
  badgeIdle: {
    backgroundColor: Colors.bg,
    borderColor: Colors.border
  },
  badgeDot: {
    borderRadius: 5,
    height: 10,
    width: 10
  },
  dotOn: {
    backgroundColor: Colors.green
  },
  dotOff: {
    backgroundColor: Colors.text4
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  badgeTextOn: {
    color: Colors.greenText
  },
  badgeTextOff: {
    color: Colors.text3
  }
});
