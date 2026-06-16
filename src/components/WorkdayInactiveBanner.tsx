/** @deprecated Not mounted in V2 — workday expiry uses NotificationBridge instead. */
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../mobile/lib/theme";
import { useTracking } from "../storage/TrackingContext";
import { requestGpsForFieldWork } from "../utils/locationRequiredModal";
import { space } from "../theme/layout";

export function WorkdayInactiveBanner() {
  const { workdayInactiveBanner, busy, startDay, isActive } = useTracking();

  if (!workdayInactiveBanner || isActive) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name="time-outline" size={18} color={Colors.amber} />
      </View>
      <Text style={styles.text}>{workdayInactiveBanner}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          void (async () => {
            const allowed = await requestGpsForFieldWork();
            if (!allowed) return;
            await startDay().catch(() => undefined);
          })();
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
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: Colors.amberBg,
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  text: {
    color: Colors.text1,
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    minWidth: 160
  },
  btn: {
    backgroundColor: Colors.brand700,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  btnDisabled: {
    opacity: 0.6
  },
  btnText: {
    color: Colors.surface,
    fontSize: 13,
    fontWeight: "800"
  }
});
