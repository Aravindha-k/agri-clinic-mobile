import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { fieldShadow, natureDarkGlass } from "../../lib/fieldTheme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Floating dark glass panel — tracking / login overlays. */
export function NatureDarkGlass({ children, style }: Props) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    ...natureDarkGlass(),
    ...fieldShadow.panel,
    overflow: "hidden"
  }
});
