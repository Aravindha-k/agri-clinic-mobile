import { ReactNode } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { CompactScreenHeader } from "./CompactScreenHeader";
import { Spacing } from "../../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Compact screen title bar — Work, Day, and secondary tabs. */
export function ScreenPageHeader({ title, subtitle, right, style }: Props) {
  return (
    <CompactScreenHeader
      title={title}
      subtitle={subtitle}
      right={right}
      style={[styles.wrap, style]}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: Spacing.sm
  }
});
