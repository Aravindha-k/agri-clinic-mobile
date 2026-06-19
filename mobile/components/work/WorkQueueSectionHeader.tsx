import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SECTION_LABEL } from "../../lib/sectionLabel";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = {
  title: string;
  count: number;
  first?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
};

export function WorkQueueSectionHeader({
  title,
  count,
  first,
  collapsible,
  collapsed,
  onToggle
}: Props) {
  const content = (
    <>
      <View style={styles.accent} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.countPill}>
        <Text style={styles.countText}>{count}</Text>
      </View>
      {collapsible ? (
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={16}
          color={Colors.text3}
          style={styles.chevron}
        />
      ) : null}
    </>
  );

  return (
    <View style={[styles.wrap, first && styles.wrapFirst]}>
      {collapsible ? (
        <Pressable onPress={onToggle} style={styles.row} accessibilityRole="button">
          {content}
        </Pressable>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    marginBottom: 6,
    marginHorizontal: Spacing.lg,
    marginTop: 12
  },
  wrapFirst: {
    marginTop: 4
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  accent: {
    backgroundColor: Colors.brand700,
    borderRadius: 2,
    height: 12,
    width: 3
  },
  title: {
    ...SECTION_LABEL,
    flex: 1,
    marginBottom: 0
  },
  countPill: {
    backgroundColor: Colors.brand50,
    borderColor: Colors.brand100,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  countText: {
    color: Colors.text2,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textAlign: "center"
  },
  chevron: {
    marginLeft: -2
  }
});
