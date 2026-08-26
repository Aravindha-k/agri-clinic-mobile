import { ChevronRight, Clock } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { DashboardRecentVisit } from "../../lib/types";
import { formatIndiaTime } from "../../../src/utils/indiaDateTime";
import { Grid, Harvest, IconSize, PremiumShadow, Typography } from "../../lib/designSystem";
import { TODAY_CARD_RADIUS, TODAY_PAGE_PAD } from "../../lib/todayLayout";
import { TodaySurfaces } from "../../lib/todaySurfaces";
import { Colors, FontWeight } from "../../lib/theme";
import { Avatar, PressableCard } from "../ui";
import { LucideGlyph } from "../ui/AppIcon";
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
      <SectionHeader title={title} action={items.length > 0 ? viewAllLabel : undefined} onAction={onViewAll} />
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
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyCard, TodaySurfaces.activity, PremiumShadow.card]}>
            <LucideGlyph icon={Clock} size={IconSize.lg} color={Colors.brand700} />
            <Text style={styles.emptyText}>{emptyLabel}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => {
            const row = (
              <PressableCard onPress={() => onPressVisit(item.id)} style={styles.rowPress}>
                <View style={[styles.rowCard, TodaySurfaces.activity, PremiumShadow.card]}>
                  <View style={styles.row}>
                    <Avatar name={item.farmer_name} size="sm" />
                    <View style={styles.copy}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.farmer_name}
                      </Text>
                      {item.village_name ? (
                        <Text style={styles.village} numberOfLines={1}>
                          {item.village_name}
                        </Text>
                      ) : null}
                      {item.crop ? (
                        <View style={styles.cropPill}>
                          <Text style={styles.cropText}>{item.crop}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.rightCol}>
                      <View style={styles.statusChip}>
                        <Text style={styles.statusText}>Completed</Text>
                      </View>
                      <Text style={styles.time}>
                        {item.visited_at ? formatIndiaTime(item.visited_at) : "—"}
                      </Text>
                      <LucideGlyph icon={ChevronRight} size={IconSize.sm} color={Harvest.textMuted} />
                    </View>
                  </View>
                </View>
              </PressableCard>
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
    gap: Grid.sm,
    marginTop: Grid.md
  },
  headerPad: {
    paddingHorizontal: TODAY_PAGE_PAD
  },
  list: {
    gap: Grid.sm,
    paddingHorizontal: TODAY_PAGE_PAD
  },
  rowPress: {
    width: "100%"
  },
  rowCard: {
    backgroundColor: Harvest.card,
    borderRadius: TODAY_CARD_RADIUS,
    padding: Grid.md
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Grid.sm
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  cropPill: {
    alignSelf: "flex-start",
    backgroundColor: Colors.greenBg,
    borderRadius: 8,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  cropText: {
    ...Typography.caption,
    color: Colors.greenText,
    fontSize: 10
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 4
  },
  statusChip: {
    backgroundColor: Colors.greenBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  statusText: {
    ...Typography.caption,
    color: Colors.greenText,
    fontSize: 10,
    fontWeight: FontWeight.semibold
  },
  name: {
    ...Typography.bodyMedium,
    fontSize: 15,
    fontWeight: FontWeight.semibold
  },
  village: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 11
  },
  time: {
    ...Typography.caption,
    color: Harvest.textMuted,
    fontSize: 11
  },
  emptyWrap: {
    paddingHorizontal: TODAY_PAGE_PAD
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: Harvest.card,
    borderRadius: TODAY_CARD_RADIUS,
    gap: Grid.sm,
    paddingVertical: Grid.xl
  },
  emptyText: {
    ...Typography.body,
    color: Harvest.textSecondary,
    textAlign: "center"
  }
});
