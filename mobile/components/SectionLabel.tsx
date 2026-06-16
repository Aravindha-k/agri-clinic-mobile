import { StyleSheet, Text, View } from "react-native";
import { SECTION_LABEL } from "../lib/sectionLabel";

type Props = {
  title: string;
  first?: boolean;
};

export function SectionLabel({ title, first }: Props) {
  return (
    <View style={[styles.wrap, first && styles.wrapFirst]}>
      <Text style={[styles.label, SECTION_LABEL]}>{title.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "transparent",
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 14
  },
  wrapFirst: {
    marginTop: 6
  },
  label: {
    marginBottom: 0
  }
});
