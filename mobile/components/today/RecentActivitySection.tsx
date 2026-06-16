import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DashboardRecentVisit } from "../../lib/types";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { formatRelativeTime } from "../../../src/utils/formatRelativeTime";
import { Avatar } from "../ui/Avatar";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";
import {
  FadeInSection,
  entranceListStagger,
  entranceStagger,
  type ScreenEntranceProps
} from "../ui/FadeInSection";

type Props = {
  title: string;
  viewAllLabel: string;
  emptyLabel: string;
  items: DashboardRecentVisit[];
  onViewAll: () => void;
  onPressVisit: (id: number) => void;
  entrance?: ScreenEntranceProps;
};

export function RecentActivitySection({
  title,
  viewAllLabel,
  emptyLabel,
  items,
  onViewAll,
  onPressVisit,
  entrance
}: Props) {
  const header = (
    <View style={styles.headerPad}>
      <SectionHeader
        title={title}
        action={items.length > 0 ? viewAllLabel : undefined}
        onAction={onViewAll}
      />
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
      {items.length === 0 ? (
        entrance ? (
          <FadeInSection
            replayKey={entrance.replayKey}
            delay={entranceListStagger(entrance.sectionStep, 0)}
            variant="card"
          >
            <FlatCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>{emptyLabel}</Text>
            </FlatCard>
          </FadeInSection>
        ) : (
          <FlatCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>{emptyLabel}</Text>
          </FlatCard>
        )
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const row = (
              <Pressable onPress={() => onPressVisit(item.id)}>
                <FlatCard style={styles.rowCard}>
                  <View style={styles.row}>
                    <Avatar name={item.farmer_name} size="sm" />
                    <View style={styles.copy}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.farmer_name}
                      </Text>
                      {item.crop ? (
                        <View style={styles.cropChip}>
                          <Text style={styles.cropText} numberOfLines={1}>
                            {item.crop}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.time}>{formatRelativeTime(item.visited_at)}</Text>
                  </View>
                </FlatCard>
              </Pressable>
            );

            if (!entrance) {
              return <View key={item.id}>{row}</View>;
            }

            return (
              <FadeInSection
                key={item.id}
                replayKey={entrance.replayKey}
                delay={entranceListStagger(entrance.sectionStep, index + 1)}
                variant="card"
              >
                {row}
              </FadeInSection>
            );
          })}
        </View>
      )}
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
  list: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg
  },
  rowCard: {
    padding: Spacing.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  name: {
    color: Colors.text1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold
  },
  cropChip: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bg,
    borderColor: Colors.border,
    borderRadius: Radius.chip,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2
  },
  cropText: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  },
  time: {
    color: Colors.text4,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  emptyCard: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl
  },
  emptyText: {
    color: Colors.text3,
    fontSize: FontSize.base,
    textAlign: "center"
  }
});
