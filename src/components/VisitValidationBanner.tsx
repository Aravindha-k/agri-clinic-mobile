import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type Props = {
  title: string;
  lines: string[];
};

export function VisitValidationBanner({ title, lines }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (lines.length === 0) {
    return null;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}>
      <Text style={[styles.title, { color: c.danger }]}>{title}</Text>
      {lines.map((line) => (
        <Text key={line} style={[styles.line, { color: c.danger }]}>
          • {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 14
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4
  },
  line: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20
  }
});
