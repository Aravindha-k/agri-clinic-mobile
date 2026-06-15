import { Pressable, ScrollView, StyleSheet, Text, ViewStyle } from "react-native";
import { FONTS } from "../../src/theme/fonts";
import { ENT } from "../../src/theme/enterprise";

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
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 7
  },
  pillInactive: {
    backgroundColor: ENT.card,
    borderColor: ENT.border,
    borderWidth: 1
  },
  pillActive: {
    backgroundColor: ENT.primary,
    borderColor: ENT.primary,
    borderWidth: 1
  },
  pillText: {
    color: ENT.textSecondary,
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: "500"
  },
  pillTextActive: {
    color: ENT.white,
    fontFamily: FONTS.bold,
    fontWeight: "700"
  }
});
