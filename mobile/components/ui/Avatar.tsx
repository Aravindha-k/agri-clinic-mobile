import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Radius, getAvatarColors, getInitials } from "../../lib/theme";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 52
};

const FONT: Record<Size, number> = {
  sm: FontSize.sm,
  md: FontSize.base,
  lg: FontSize.lg
};

type Props = {
  name: string;
  size?: Size;
  style?: ViewStyle;
};

export function Avatar({ name, size = "md", style }: Props) {
  const dim = SIZES[size];
  const [bg, fg] = getAvatarColors(name);
  const borderRadius = size === "lg" ? Radius.card : Radius.lg;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dim,
          height: dim,
          borderRadius,
          backgroundColor: bg
        },
        style
      ]}
    >
      <Text style={{ color: fg, fontSize: FONT[size], fontWeight: FontWeight.semibold }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  }
});
