import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrandInlineLogo } from "../brand/BrandInlineLogo";
import { Colors, Spacing, TextStyles, minTouchStyle } from "../../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Compact title bar — small logo + screen title. Used on Work, Day, My Location. */
export function CompactScreenHeader({ title, subtitle, right, onBack, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={8}
            style={styles.backBtn}
          >
            <Ionicons color={Colors.text1} name="chevron-back" size={22} />
          </Pressable>
        ) : null}
        <BrandInlineLogo />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    minHeight: 48
  },
  backBtn: {
    ...minTouchStyle,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -4
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  right: {
    flexShrink: 0
  },
  title: {
    ...TextStyles.h3,
    color: Colors.text1
  },
  subtitle: {
    ...TextStyles.caption,
    color: Colors.text3
  }
});
