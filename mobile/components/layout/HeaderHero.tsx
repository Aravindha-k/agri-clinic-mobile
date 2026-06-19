import { Image, type ImageContentPosition, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { AppLogo } from "../../../src/components/brand/AppLogo";
import { SCREEN_HEADER_IMAGE_BLEED, SCREEN_HEADER_OVERLAY } from "../../lib/screenHeaderImages";
import { FontSize, FontWeight, Spacing } from "../../lib/theme";

export type HeaderHeroOverlayStyle = {
  colors: string[];
  locations?: number[];
};

type Props = {
  imageSource: ImageSource;
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

export function HeaderHero({
  imageSource,
  height = 220,
  title,
  subtitle,
  showLogo = false,
  overlayStyle = SCREEN_HEADER_OVERLAY,
  contentPosition = "center",
  absolute = false,
  safeTop = 0,
  alignContent = "top",
  imageBleed = SCREEN_HEADER_IMAGE_BLEED,
  children,
  style
}: Props) {
  const bleedX = imageBleed;
  const bleedY = imageBleed + 0.06;

  return (
    <View
      style={[
        styles.shell,
        { height },
        absolute && styles.absolute,
        style
      ]}
      pointerEvents={absolute ? "none" : "auto"}
    >
      <Image
        source={imageSource}
        style={[
          styles.heroImage,
          {
            width: `${bleedX * 100}%`,
            height: `${bleedY * 100}%`,
            left: `${-(bleedX - 1) * 50}%`,
            top: `${-(bleedY - 1) * 45}%`
          }
        ]}
        contentFit="cover"
        contentPosition={contentPosition}
        cachePolicy="memory-disk"
        transition={0}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={overlayStyle.colors as [string, string, ...string[]]}
        locations={overlayStyle.locations as [number, number, ...number[]] | undefined}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.content,
          alignContent === "top" ? styles.contentTop : styles.contentBottom,
          { paddingTop: safeTop + Spacing.sm }
        ]}
        pointerEvents="box-none"
      >
        {showLogo ? (
          <View style={styles.logoShell}>
            <AppLogo
              size="lg"
              showWordmark
              layout="horizontal"
              compactWordmark
              bare
              variant="light"
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
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    width: "100%"
  },
  absolute: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 0
  },
  heroImage: {
    position: "absolute"
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg
  },
  contentTop: {
    justifyContent: "flex-start",
    paddingBottom: Spacing.sm
  },
  contentBottom: {
    justifyContent: "flex-end",
    paddingBottom: Spacing.md
  },
  logoShell: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 999,
    marginBottom: Spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  title: {
    color: "#FFFFFF",
    fontSize: FontSize.hero,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  subtitle: {
    color: "rgba(255,255,255,0.94)",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  }
});
