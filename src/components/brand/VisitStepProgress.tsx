import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

const STEPS = ["Farmer", "Crop", "Category", "Problem", "Advice", "Photos", "Submit"] as const;

type Props = {
  /** 0 = Farmer … 6 = Submit / review */
  step: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

export function VisitStepProgress({ step }: Props) {
  const { colors, type } = useDesignSystem();

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
        {STEPS.map((label, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: done || active ? colors.primary : colors.cardMuted,
                    borderColor: active ? colors.primaryDark : colors.border
                  }
                ]}
              >
                <Text style={{ color: done || active ? "#FFFFFF" : colors.muted, fontSize: 10, fontWeight: "900" }}>
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  type.caption,
                  {
                    color: active ? colors.primaryDark : done ? colors.textSecondary : colors.muted,
                    fontWeight: active ? "800" : "600",
                    fontSize: 10
                  }
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.bar, { backgroundColor: colors.borderSubtle ?? colors.border }]}>
        <View
          style={[styles.fill, { backgroundColor: colors.primary, width: `${((step + 1) / STEPS.length) * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  track: { gap: 6, paddingHorizontal: 2 },
  step: { alignItems: "center", gap: 4, minWidth: 52 },
  dot: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  bar: { borderRadius: 999, height: 4, overflow: "hidden" },
  fill: { borderRadius: 999, height: "100%" }
});
