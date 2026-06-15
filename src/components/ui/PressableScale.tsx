import { useRef, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";

type Props = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export function PressableScale({ children, style, onPress, disabled, scaleTo = 0.95, ...props }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={onPress}
      onPressIn={(e) => {
        onPressIn();
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        onPressOut();
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
