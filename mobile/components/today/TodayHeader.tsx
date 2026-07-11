import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";
import { useLiveClock } from "../../../src/hooks/useLiveClock";
import { useI18n } from "../../../src/i18n/I18nContext";
import { BrandHeader, BrandHeaderDots, BrandHeaderSpacing, GreetingHeader } from "../brand";
import { HomeLogoHero } from "./HomeLogoHero";
import { AppIcon } from "../ui/AppIcon";
import { FadeInSection, entranceStagger } from "../ui/FadeInSection";
import { FieldGlassSurface } from "../ui/FieldGlassSurface";
import { Colors, FontWeight, Radius, Shadow, Spacing, minTouchStyle } from "../../lib/theme";
import { TODAY_PAGE_PAD } from "../../lib/todayLayout";
import { TodayHeroLayers } from "./hero";

type Props = {
  greeting: string;
  name?: string | null;
  dateLabel: string;
  notificationCount: number;
  onNotifications: () => void;
  entranceTick?: number | string;
  entranceStep?: number;
  scrollY?: SharedValue<number>;
};

export function TodayHeader({
  greeting,
  name,
  dateLabel,
  notificationCount,
  onNotifications,
  entranceTick = 0,
  entranceStep = 0,
  scrollY
}: Props) {
  const { t } = useI18n();
  const { time } = useLiveClock();
  const firstName = name?.trim().split(/\s+/)[0] ?? null;

  const greetingScrollStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return {
      opacity: interpolate(scrollY.value, [0, 90], [1, 0.35], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [0, 100], [0, -6], Extrapolation.CLAMP)
        }
      ]
    };
  });

  const bell = (
    <Pressable
      onPress={onNotifications}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      style={({ pressed }) => [styles.bell, pressed && { opacity: 0.88 }]}
    >
      <AppIcon name="bell" size={20} color={Colors.text2} />
      {notificationCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <FieldGlassSurface style={styles.glass} borderRadius={26}>
        <TodayHeroLayers />
        <BrandHeaderDots />
        <BrandHeader
          size="hero"
          variant="plain"
          layout="split"
          align="left"
          right={bell}
          logo={<HomeLogoHero replayKey={entranceTick} />}
          entrance={{ replayKey: entranceTick, step: entranceStep }}
          scrollY={scrollY}
          style={styles.brandHeader}
        />
        <Animated.View style={greetingScrollStyle}>
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(entranceStep + 2)} duration={280}>
            <GreetingHeader
              timeGreeting={greeting}
              welcomePrefix={t("home.welcomeBack")}
              firstName={firstName}
              operationsLine={t("home.fieldOperations")}
              dateLabel={dateLabel}
              timeLabel={time}
            />
          </FadeInSection>
        </Animated.View>
      </FieldGlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 26,
    marginHorizontal: TODAY_PAGE_PAD,
    overflow: "visible",
    paddingBottom: BrandHeaderSpacing.greetingToHero,
    position: "relative"
  },
  glass: {
    marginTop: Spacing.sm,
    minHeight: 288,
    overflow: "visible"
  },
  brandHeader: {
    paddingLeft: 4,
    paddingRight: 8,
    paddingTop: 8,
    zIndex: 4
  },
  bell: {
    ...minTouchStyle,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.inner,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    ...Shadow.card
  },
  badge: {
    alignItems: "center",
    backgroundColor: Colors.red,
    borderRadius: 7,
    height: 14,
    justifyContent: "center",
    minWidth: 14,
    paddingHorizontal: 3,
    position: "absolute",
    right: -2,
    top: -2
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 8,
    fontWeight: FontWeight.bold
  }
});
