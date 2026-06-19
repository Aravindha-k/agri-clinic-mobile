import { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { AnimatedBrandLogo } from "../../../src/components/brand/AnimatedBrandLogo";
import { BRAND } from "../../../src/config/brand";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

export const HEADER_LOGO_SIZE = 42;

type Props = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  showWordmark?: boolean;
  logoSize?: number;
  logoBackdrop?: boolean;
  style?: ViewStyle;
};

function HeaderBrandMark({ size, backdrop }: { size: number; backdrop?: boolean }) {
  const logo = <AnimatedBrandLogo size={size} showGlow={false} />;

  if (!backdrop) {
    return <View style={[styles.logoSlot, { height: size, width: size }]}>{logo}</View>;
  }

  const ring = size + 6;
  return (
    <View
      style={[
        styles.logoBackdrop,
        {
          borderRadius: ring / 2,
          height: ring,
          width: ring
        }
      ]}
    >
      {logo}
    </View>
  );
}

/** Tab / stack header with animated brand mark. */
export function BrandPageHeader({
  title,
  subtitle,
  right,
  showWordmark = true,
  logoSize = HEADER_LOGO_SIZE,
  logoBackdrop = true,
  style
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <HeaderBrandMark size={logoSize} backdrop={logoBackdrop} />
          {showWordmark ? (
            <View style={styles.wordmark}>
              <Text style={styles.brandName} numberOfLines={1}>
                {BRAND.appName}
              </Text>
              <Text style={styles.brandTag} numberOfLines={1}>
                {BRAND.tagline}
              </Text>
            </View>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {title ? (
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** @deprecated Use HEADER_LOGO_SIZE */
export const HOME_LOGO_SIZE = HEADER_LOGO_SIZE;

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md
  },
  brand: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  logoSlot: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center"
  },
  logoBackdrop: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    justifyContent: "center"
  },
  wordmark: {
    flex: 1,
    gap: 1,
    justifyContent: "center",
    minWidth: 0
  },
  brandName: {
    color: Colors.text1,
    fontSize: 15,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.2
  },
  brandTag: {
    color: Colors.text3,
    fontSize: 10,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.1
  },
  right: {
    flexShrink: 0
  },
  copy: {
    gap: 2,
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
    fontWeight: FontWeight.medium
  }
});
