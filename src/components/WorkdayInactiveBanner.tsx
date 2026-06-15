import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTracking } from "../storage/TrackingContext";
import { ENT, ENT_CARD_SHADOW } from "../theme/enterprise";
import { space } from "../theme/layout";

export function WorkdayInactiveBanner() {
  const { workdayInactiveBanner, busy, startDay, isActive } = useTracking();

  if (!workdayInactiveBanner || isActive) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name="time-outline" size={18} color={ENT.warning} />
      </View>
      <Text style={styles.text}>{workdayInactiveBanner}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          void startDay().catch(() => undefined);
        }}
        style={[styles.btn, busy && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>Start day</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: ENT.card,
    borderColor: ENT.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...ENT_CARD_SHADOW
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: ENT.warningSoft,
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  text: {
    color: ENT.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    minWidth: 160
  },
  btn: {
    backgroundColor: ENT.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  btnDisabled: {
    opacity: 0.6
  },
  btnText: {
    color: ENT.white,
    fontSize: 13,
    fontWeight: "800"
  }
});
