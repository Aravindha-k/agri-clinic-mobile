import { Image, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LOGO_IMAGE } from "../../config/brand";

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Canonical in-app company mark — circular, transparent edges, premium shadow.
 * Always uses project-root logo.png. Never uses launcher/adaptive artwork.
 */
export function CompanyLogoMark({
  size = 72,
  style,
  accessibilityLabel = "Kavya Agri Clinic logo"
}: Props) {
  if (!LOGO_IMAGE) {
    return <View style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
  }

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2
        },
        styles.shadow,
        style
      ]}
    >
      <Image
        source={LOGO_IMAGE}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    overflow: "hidden"
  },
  shadow: Platform.select({
    ios: {
      shadowColor: "#062818",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14
    },
    default: {
      elevation: 6
    }
  })
});
