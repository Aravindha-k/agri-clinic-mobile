import { StyleSheet, Text, View } from "react-native";
import { FONTS } from "../../src/theme/fonts";

type Props = {
  title: string;
  /** Extra top margin for first section in a list */
  first?: boolean;
};

export function SectionLabel({ title, first }: Props) {
  return (
    <View style={[styles.wrap, first && styles.wrapFirst]}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#f8fafc",
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 14
  },
  wrapFirst: {
    marginTop: 6
  },
  label: {
    color: "#94a3b8",
    fontFamily: FONTS.bold,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase"
  }
});
