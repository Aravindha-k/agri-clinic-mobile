import { Pressable, ScrollView, StyleSheet, Text, ViewStyle } from "react-native";
import { FONTS } from "../../src/theme/fonts";

const DS = {
  surface: "#ffffff",
  inputBorder: "#e2e8f0",
  textSubtle: "#64748b",
  accent: "#16a34a"
} as const;

export type FilterPill = {
  id: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

type Props = {
  pills: FilterPill[];
  style?: ViewStyle;
};

function FilterPillButton({ label, active, onPress }: Omit<FilterPill, "id">) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active ? styles.pillActive : styles.pillInactive,
        pressed && { opacity: 0.9 }
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontal filter pills — constrained height so pills never stretch vertically. */
export function FilterPillRow({ pills, style }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={[styles.scroll, style]}
      contentContainerStyle={styles.row}
    >
      {pills.map((pill) => (
        <FilterPillButton
          key={pill.id}
          label={pill.label}
          active={pill.active}
          onPress={pill.onPress}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginTop: 10,
    maxHeight: 36
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingRight: 24
  },
  pill: {
    alignSelf: "center",
    borderRadius: 99,
    borderWidth: 1.5,
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  pillInactive: {
    backgroundColor: DS.surface,
    borderColor: DS.inputBorder
  },
  pillActive: {
    backgroundColor: DS.accent,
    borderColor: DS.accent
  },
  pillText: {
    color: DS.textSubtle,
    fontFamily: FONTS.semibold,
    fontSize: 10,
    fontWeight: "600"
  },
  pillTextActive: {
    color: "#fff"
  }
});
