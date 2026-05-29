import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

type Props = {
  title?: string;
  items: string[];
};

export function VisitMandatoryBanner({ title = "Required for this visit", items }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.wrap, { backgroundColor: c.cardMuted, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.row}>
          <Text style={[styles.bullet, { color: c.danger }]}>•</Text>
          <Text style={[styles.item, { color: c.muted }]}>
            {item} <Text style={{ color: c.danger, fontWeight: "800" }}>Required</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 2
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  bullet: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20
  },
  item: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20
  }
});
