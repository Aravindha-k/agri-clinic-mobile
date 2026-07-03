import { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { CompactScreenHeader } from "./CompactScreenHeader";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  style?: ViewStyle;
};

/** Stack / detail header — screen title only, no repeated full brand block. */
export function BrandPageHeader({ title, subtitle, right, style }: Props) {
  if (!title) {
    return null;
  }

  return (
    <View style={[styles.wrap, style]}>
      <CompactScreenHeader title={title} subtitle={subtitle} right={right} style={styles.compact} />
    </View>
  );
}

/** @deprecated Use BRAND_LOGO_COMPACT from brand module */
export const HEADER_LOGO_SIZE = 40;

/** @deprecated Use HEADER_LOGO_SIZE */
export const HOME_LOGO_SIZE = HEADER_LOGO_SIZE;

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: Spacing.sm
  },
  compact: {
    paddingBottom: 0,
    paddingTop: 0
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  }
});
