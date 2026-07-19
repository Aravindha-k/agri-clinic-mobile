import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Grid, IconSize, PremiumShadow, Typography } from "../../lib/designSystem";
import { TODAY_CARD_RADIUS, TODAY_PAGE_PAD } from "../../lib/todayLayout";
import { Colors, FontWeight } from "../../lib/theme";
import { IconPopOnce } from "../ui/IconPopOnce";
import { PressableCard } from "../ui/PressableCard";
import { SectionHeader } from "../ui/SectionHeader";
import {
  FadeInSection,
  entranceListStagger,
  entranceStagger,
  type ScreenEntranceProps
} from "../ui/FadeInSection";

const TILE_GRADIENTS: Record<string, readonly [string, string]> = {
  farmers: ["#2E9B64", "#0F6B43"],
  newVisit: ["#0EA5E9", "#0284C7"],
  visits: ["#14B8A6", "#0D9488"],
  routes: ["#F59E0B", "#D97706"],
  problems: ["#8B5CF6", "#6D28D9"]
};

export type TodayQuickAction = {
  key: string;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  onPress: () => void;
};

type Props = {
  title: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
  actions: TodayQuickAction[];
  entrance?: ScreenEntranceProps;
};

/** Horizontal quick-action rail — circular icons like reference mock. */
export function TodayQuickActions({ title, viewAllLabel, onViewAll, actions, entrance }: Props) {
  const header = (
    <View style={styles.headerPad}>
      <SectionHeader title={title} action={viewAllLabel} onAction={onViewAll} />
    </View>
  );

  const rail = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.railContent}
    >
      {actions.map((action, index) => {
        const gradient = TILE_GRADIENTS[action.key] ?? (["#2E9B64", "#0F6B43"] as const);
        return (
          <PressableCard
            key={action.key}
            onPress={action.onPress}
            accessibilityRole="button"
            style={styles.railItem}
          >
            <LinearGradient colors={[...gradient]} style={styles.iconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <IconPopOnce icon={action.icon} size={IconSize.md} color={Colors.onPrimary} delay={index * 40} />
            </LinearGradient>
            <Text style={styles.railLabel} numberOfLines={2}>
              {action.label}
            </Text>
          </PressableCard>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.section}>
      {entrance ? (
        <FadeInSection replayKey={entrance.replayKey} delay={entranceStagger(entrance.sectionStep)}>
          {header}
        </FadeInSection>
      ) : (
        header
      )}
      {entrance ? (
        <FadeInSection
          replayKey={entrance.replayKey}
          delay={entranceListStagger(entrance.sectionStep, 1)}
          variant="card"
        >
          {rail}
        </FadeInSection>
      ) : (
        rail
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Grid.sm,
    marginTop: Grid.md
  },
  headerPad: {
    paddingHorizontal: TODAY_PAGE_PAD
  },
  railContent: {
    gap: Grid.md,
    paddingHorizontal: TODAY_PAGE_PAD,
    paddingVertical: Grid.xs
  },
  railItem: {
    alignItems: "center",
    width: 72
  },
  iconCircle: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
    ...PremiumShadow.card
  },
  railLabel: {
    ...Typography.caption,
    fontSize: 11,
    fontWeight: FontWeight.medium,
    marginTop: Grid.xs,
    textAlign: "center"
  }
});
