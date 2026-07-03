import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  /** Set false when parent already applies top safe area (e.g. SafeAreaView). */
  includeSafeTop?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Unified pushed-screen header: back + title + optional subtitle. */
export function StackScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  includeSafeTop = true,
  style
}: Props) {
  const { top: safeTop } = useSafeAreaInsetsCompat();

  return (
    <View
      style={[
        styles.wrap,
        includeSafeTop ? { paddingTop: safeTop + Spacing.sm } : null,
        style
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.88 }]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.brand700} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.rightSlot}>{right ?? <View style={styles.backSpacer} />}</View>
      </View>
    </View>
  );
}

const BTN = Layout.touchTargetMin - 8;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.screen
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm
  },
  backBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.inner,
    borderWidth: StyleSheet.hairlineWidth,
    height: BTN,
    justifyContent: "center",
    width: BTN
  },
  backSpacer: {
    height: BTN,
    width: BTN
  },
  titles: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    lineHeight: 20
  },
  rightSlot: {
    alignItems: "flex-end",
    flexShrink: 0,
    justifyContent: "center",
    maxWidth: 120,
    minWidth: BTN
  }
});
