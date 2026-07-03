import type { ImageContentPosition, ImageSource } from "expo-image";
import { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { AppLogo } from "../../../src/components/brand/AppLogo";
import { resolveScreenHeaderHeight } from "../../lib/screenHeaderImages";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "../../lib/theme";

export type HeaderHeroOverlayStyle = {
  colors: string[];
  locations?: number[];
};

type Props = {
  /** @deprecated Decorative images removed — ignored */
  imageSource?: ImageSource;
  height?: number;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  overlayStyle?: HeaderHeroOverlayStyle;
  contentPosition?: ImageContentPosition;
  absolute?: boolean;
  safeTop?: number;
  alignContent?: "top" | "bottom";
  imageBleed?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Clean page header — logo, title, and optional toolbar. No background photos. */
export function HeaderHero({
  height,
  title,
  subtitle,
  showLogo = false,
  absolute = false,
  safeTop = 0,
  alignContent = "top",
  children,
  style
}: Props) {
  const shellHeight = height ?? resolveScreenHeaderHeight();

  return (
    <View
      style={[
        styles.shell,
        { minHeight: shellHeight, paddingTop: safeTop + Spacing.sm },
        alignContent === "bottom" && styles.shellBottom,
        absolute && styles.absolute,
        style
      ]}
      pointerEvents={absolute ? "none" : "auto"}
    >
      <View style={[styles.inner, alignContent === "bottom" && styles.innerBottom]}>
        {children}
        {showLogo ? (
          <View style={styles.logoShell}>
            <AppLogo
              size="lg"
              showWordmark
              layout="horizontal"
              compactWordmark
              bare
              variant="dark"
              style={styles.logo}
            />
          </View>
        ) : null}
        {title ? (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: Colors.bg,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: "100%"
  },
  absolute: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 0
  },
  shellBottom: {
    justifyContent: "flex-end"
  },
  inner: {
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg
  },
  innerBottom: {
    justifyContent: "flex-end"
  },
  logoShell: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Shadow.card
  },
  logo: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: Colors.text1,
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3
  },
  subtitle: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 20
  }
});
