import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";
import { useLocaleTypography } from "../../hooks/useLocaleTypography";

type Props = {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
};

export function SectionTitle({ title, subtitle, style }: Props) {
  const typo = useLocaleTypography();

  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.title, typo.sectionTitle]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, typo.body]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
    marginBottom: Spacing.sm
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.section,
    fontWeight: FontWeight.semibold
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.body,
    lineHeight: 20
  }
});
