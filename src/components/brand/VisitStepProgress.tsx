import { StyleSheet, Text, View } from "react-native";
import { useDesignSystem } from "../../hooks/useDesignSystem";

const STEPS = ["Farmer", "Field", "Review"] as const;

type Props = {
  step: 0 | 1 | 2;
};

export function VisitStepProgress({ step }: Props) {
  const { colors, type } = useDesignSystem();

  return (
    <View style={styles.wrap}>
      <View style={styles.track}>
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
                <Text style={{ color: done || active ? "#FFFFFF" : colors.muted, fontSize: 11, fontWeight: "900" }}>
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  type.caption,
                  {
                    color: active ? colors.primaryDark : colors.muted,
                    fontWeight: active ? "800" : "600"
                  }
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={[styles.bar, { backgroundColor: colors.borderSubtle ?? colors.border }]}>
        <View style={[styles.fill, { backgroundColor: colors.primary, width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  track: { flexDirection: "row", justifyContent: "space-between" },
  step: { alignItems: "center", flex: 1, gap: 4 },
  dot: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  bar: { borderRadius: 999, height: 4, overflow: "hidden" },
  fill: { borderRadius: 999, height: "100%" }
});
