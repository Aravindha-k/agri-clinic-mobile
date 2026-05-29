import { Ionicons } from "@expo/vector-icons";
import { useLayoutEffect } from "react";
import { Pressable } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

/** Ensures a visible back control; falls back to list route when stack has no history. */
export function useStackHeaderBack(
  navigation: NativeStackNavigationProp<Record<string, object | undefined>>,
  fallbackRoute?: string
) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: true,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            if (fallbackRoute) {
              navigation.navigate(fallbackRoute as never);
            }
          }}
          style={{ marginLeft: 4, padding: 4 }}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </Pressable>
      )
    });
  }, [navigation, fallbackRoute]);
}
