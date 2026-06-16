import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../mobile/lib/theme";

export function GlobalOfflineBanner() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      Animated.spring(translateY, {
        toValue: offline ? 0 : -60,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8
      }).start();
    });
    return unsub;
  }, [translateY]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top + 8, transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>Working offline — data will sync when connected</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.amberBg,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 9998
  },
  text: {
    color: Colors.text1,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center"
  }
});
