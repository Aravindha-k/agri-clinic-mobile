import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsetsCompat } from "../../../src/hooks/useSafeAreaInsetsCompat";
import { subscribeLanOnly } from "../../../src/utils/connectivityBus";
import { LAN_OFFLINE_BANNER_MESSAGE } from "../../lib/api";
import { Colors, FontSize, FontWeight, Radius } from "../../lib/theme";

const TOAST_MS = 5000;

/** Amber toast when the app cannot reach a LAN-only dev API (field / mobile data). */
export function LanOfflineToast() {
  const { top } = useSafeAreaInsetsCompat();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return subscribeLanOnly((active) => {
      if (!active) return;
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), TOAST_MS);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: top + 8 }]}>
      <Ionicons name="warning-outline" size={16} color={Colors.amberText} />
      <Text style={styles.text}>{LAN_OFFLINE_BANNER_MESSAGE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: Colors.amberBg,
    borderColor: "#fde68a",
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
    right: 16,
    zIndex: 100
  },
  text: {
    color: Colors.amberText,
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  }
});
