import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";

export type WorkSegment = "queue" | "visits";

type Props = {
  segment: WorkSegment;
  queueLabel: string;
  visitsLabel: string;
  onChange: (segment: WorkSegment) => void;
};

export function WorkSegmentBar({ segment, queueLabel, visitsLabel, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onChange("queue")}
        style={[styles.segment, segment === "queue" && styles.segmentActive]}
      >
        <Text style={[styles.label, segment === "queue" && styles.labelActive]}>{queueLabel}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("visits")}
        style={[styles.segment, segment === "visits" && styles.segmentActive]}
      >
        <Text style={[styles.label, segment === "visits" && styles.labelActive]}>{visitsLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.button,
    borderWidth: 1,
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    padding: 3
  },
  segment: {
    alignItems: "center",
    borderRadius: Radius.inner,
    flex: 1,
    paddingVertical: 10
  },
  segmentActive: {
    backgroundColor: Colors.brand700
  },
  label: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  labelActive: {
    color: Colors.surface
  }
});
