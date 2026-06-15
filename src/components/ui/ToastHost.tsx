import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast, type ToastItem, type ToastType } from "../../storage/ToastContext";
import { ENT, ENT_CARD_SHADOW } from "../../theme/enterprise";
import GlassCard from "../glass/GlassCard";

const TYPE_STYLES: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { icon: "checkmark-circle", color: ENT.primary },
  error: { icon: "alert-circle", color: ENT.danger },
  warning: { icon: "warning", color: ENT.warning }
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-60)).current;
  const style = TYPE_STYLES[toast.type];

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10
    }).start();
  }, [translateY]);

  const dismiss = () => {
    Animated.timing(translateY, { toValue: -60, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  };

  return (
    <Animated.View
      style={[
        styles.host,
        {
          top: insets.top + 12,
          transform: [{ translateY }]
        }
      ]}
    >
      <GlassCard style={styles.glassCard}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: `${style.color}18` }]}>
            <Ionicons name={style.icon} size={18} color={style.color} />
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>
          <Pressable onPress={dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Dismiss">
            <Ionicons name="close" size={18} color={ENT.textMuted} />
          </Pressable>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

export function ToastHost() {
  const { toasts, dismiss } = useToast();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    left: 14,
    position: "absolute",
    right: 14,
    zIndex: 9999
  },
  glassCard: {
    borderRadius: 14,
    ...ENT_CARD_SHADOW
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  message: {
    color: ENT.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "600"
  }
});
