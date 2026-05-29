import { ColorValue } from "react-native";
import { colors } from "./colors";

/** Consistent pull-to-refresh tint across screens. */
export const refreshControlProps = {
  tintColor: colors.primary,
  colors: [colors.primary] as ColorValue[]
};
