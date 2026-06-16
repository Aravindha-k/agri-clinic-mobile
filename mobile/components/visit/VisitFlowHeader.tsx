import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

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
    <Pressable onPress={onBack} style={styles.iconBtn} accessibilityRole="button">
      <Ionicons name="arrow-back" size={18} color={Colors.text1} />
    </Pressable>
  ) : onClose ? (
    <Pressable onPress={onClose} style={styles.iconBtn} accessibilityRole="button">
      <Ionicons name="close" size={18} color={Colors.text1} />
    </Pressable>
  ) : (
    <View style={styles.iconBtnSpacer} />
  );

  return (
    <View style={styles.header}>
      {leadingAction}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
    flexDirection: "row",
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: Spacing.screen,
    paddingTop: 8
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  iconBtnSpacer: {
    height: 32,
    width: 32
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  gpsPill: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  gpsDot: {
    borderRadius: 4,
    height: 7,
    width: 7
  },
  gpsText: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  }
});
