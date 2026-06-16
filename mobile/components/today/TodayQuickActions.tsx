import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";
import {
  FadeInSection,
  entranceListStagger,
  entranceStagger,
  type ScreenEntranceProps
} from "../ui/FadeInSection";

export type TodayQuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

type Props = {
  title: string;
  actions: TodayQuickAction[];
  entrance?: ScreenEntranceProps;
};

export function TodayQuickActions({ title, actions, entrance }: Props) {
  const header = (
    <View style={styles.headerPad}>
      <SectionHeader title={title} />
    </View>
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
      <View style={styles.grid}>
        {actions.map((action, index) => {
          const tile = (
            <FlatCard style={styles.tileWrap}>
              <Pressable
                onPress={action.onPress}
                accessibilityRole="button"
                style={({ pressed }) => [styles.tile, pressed && { opacity: 0.92 }]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={action.icon} size={20} color={Colors.brand700} />
                </View>
                <Text style={styles.label} numberOfLines={2}>
                  {action.label}
                </Text>
              </Pressable>
            </FlatCard>
          );

          if (!entrance) {
            return <View key={action.key}>{tile}</View>;
          }

          return (
            <FadeInSection
              key={action.key}
              replayKey={entrance.replayKey}
              delay={entranceListStagger(entrance.sectionStep, index + 1)}
              variant="card"
              style={styles.tileWrap}
            >
              <FlatCard style={styles.tileCard}>
                <Pressable
                  onPress={action.onPress}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.tile, pressed && { opacity: 0.92 }]}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={action.icon} size={20} color={Colors.brand700} />
                  </View>
                  <Text style={styles.label} numberOfLines={2}>
                    {action.label}
                  </Text>
                </Pressable>
              </FlatCard>
            </FadeInSection>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
    marginTop: Spacing.lg
  },
  headerPad: {
    paddingHorizontal: Spacing.lg
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg
  },
  tileWrap: {
    flexBasis: "47%",
    flexGrow: 1
  },
  tileCard: {
    flex: 1
  },
  tile: {
    alignItems: "flex-start",
    gap: Spacing.sm,
    minHeight: 88,
    padding: Spacing.md
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.brand50,
    borderRadius: Radius.inner,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  label: {
    color: Colors.text1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  }
});
