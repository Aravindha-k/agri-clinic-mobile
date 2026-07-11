import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing, TextStyles, minTouchStyle } from "../../lib/theme";

type Props = {
  title: string;
  subtitle: string;
  onClose?: () => void;
  onBack?: () => void;
  gpsAccuracy?: number | null;
  gpsLabel?: string;
  gpsDotColor?: string;
};

export function VisitFlowHeader({ title, subtitle, onClose, onBack, gpsAccuracy, gpsLabel, gpsDotColor }: Props) {
  const leadingAction = onBack ? (
    <Pressable
      onPress={onBack}
      style={styles.iconBtn}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={22} color={Colors.brand700} />
    </Pressable>
  ) : onClose ? (
    <Pressable
      onPress={onClose}
      style={styles.iconBtn}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={8}
    >
      <Ionicons name="close" size={22} color={Colors.text2} />
    </Pressable>
  ) : (
    <View style={styles.iconBtnSpacer} />
  );

  return (
    <View style={styles.header}>
      {leadingAction}
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {gpsAccuracy !== undefined && gpsLabel && gpsDotColor ? (
        <View style={styles.gpsPill}>
          <View style={[styles.gpsDot, { backgroundColor: gpsDotColor }]} />
          <Text style={styles.gpsText}>{gpsLabel}</Text>
        </View>
      ) : (
        <View style={styles.iconBtnSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm
  },
  iconBtn: {
    ...minTouchStyle,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.inner,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center"
  },
  iconBtnSpacer: {
    height: Layout.touchTargetMin,
    width: Layout.touchTargetMin
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  title: {
    ...TextStyles.h3,
    color: Colors.text1
  },
  subtitle: {
    ...TextStyles.caption,
    color: Colors.text3
  },
  gpsPill: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    maxWidth: 120,
    minHeight: Layout.touchTargetMin,
    paddingHorizontal: Spacing.sm
  },
  gpsDot: {
    borderRadius: 4,
    height: 7,
    width: 7
  },
  gpsText: {
    color: Colors.text3,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold
  }
});
