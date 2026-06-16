import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { DashboardFollowUp } from "../../lib/types";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../../lib/theme";
import { FlatCard } from "../layout/FlatCard";
import { SectionHeader } from "../ui/SectionHeader";

type Props = {
  title: string;
  viewAllLabel: string;
  emptyLabel: string;
  items: DashboardFollowUp[];
  dueTodayLabel: string;
  dayOverdueLabel: string;
  daysOverdueLabel: (count: number) => string;
  startVisitLabel: string;
  onViewAll: () => void;
  onStartVisit: (item: DashboardFollowUp) => void;
};

function overdueLabel(
  item: DashboardFollowUp,
  dueTodayLabel: string,
  dayOverdueLabel: string,
  daysOverdueLabel: (count: number) => string
) {
  if (item.due_today || item.days_overdue === 0) return dueTodayLabel;
  if (item.days_overdue === 1) return dayOverdueLabel;
  return daysOverdueLabel(item.days_overdue);
}

function FollowUpCard({
  item,
  dueTodayLabel,
  dayOverdueLabel,
  daysOverdueLabel,
  startVisitLabel,
  onStartVisit
}: {
  item: DashboardFollowUp;
  dueTodayLabel: string;
  dayOverdueLabel: string;
  daysOverdueLabel: (count: number) => string;
  startVisitLabel: string;
  onStartVisit: () => void;
}) {
  const overdue = item.days_overdue > 0 && !item.due_today;
  const badgeLabel = overdueLabel(item, dueTodayLabel, dayOverdueLabel, daysOverdueLabel);

  return (
    <FlatCard style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.farmerName} numberOfLines={1}>
          {item.farmer_name}
        </Text>
        <View style={[styles.badge, overdue ? styles.badgeOverdue : styles.badgeToday]}>
          <Text style={[styles.badgeText, overdue ? styles.badgeTextOverdue : styles.badgeTextToday]}>
            {badgeLabel}
          </Text>
        </View>
      </View>
      {item.crop ? (
        <Text style={styles.meta} numberOfLines={1}>
          {item.crop}
        </Text>
      ) : null}
      {item.problem ? (
        <Text style={styles.problem} numberOfLines={2}>
          {item.problem}
        </Text>
      ) : null}
      <Pressable
        onPress={onStartVisit}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.92 }]}
      >
        <Ionicons name="add-circle-outline" size={16} color={Colors.surface} />
        <Text style={styles.ctaText}>{startVisitLabel}</Text>
      </Pressable>
    </FlatCard>
  );
}

export function FollowUpCarousel({
  title,
  viewAllLabel,
  emptyLabel,
  items,
  dueTodayLabel,
  dayOverdueLabel,
  daysOverdueLabel,
  startVisitLabel,
  onViewAll,
  onStartVisit
}: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.headerPad}>
        <SectionHeader title={title} action={items.length > 0 ? viewAllLabel : undefined} onAction={onViewAll} />
      </View>
      {items.length === 0 ? (
        <FlatCard style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={28} color={Colors.text4} />
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </FlatCard>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          decelerationRate="fast"
          snapToInterval={296}
        >
          {items.map((item) => (
            <FollowUpCard
              key={String(item.id)}
              item={item}
              dueTodayLabel={dueTodayLabel}
              dayOverdueLabel={dayOverdueLabel}
              daysOverdueLabel={daysOverdueLabel}
              startVisitLabel={startVisitLabel}
              onStartVisit={() => onStartVisit(item)}
            />
          ))}
        </ScrollView>
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
  carousel: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingRight: Spacing.xl
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.cardLg,
    width: 280
  },
  cardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between"
  },
  farmerName: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  badge: {
    borderRadius: Radius.chip,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  badgeToday: {
    backgroundColor: Colors.amberBg
  },
  badgeOverdue: {
    backgroundColor: Colors.redBg
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  },
  badgeTextToday: {
    color: Colors.amberText
  },
  badgeTextOverdue: {
    color: Colors.redText
  },
  meta: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium
  },
  problem: {
    color: Colors.text2,
    fontSize: FontSize.base,
    lineHeight: 18
  },
  cta: {
    alignItems: "center",
    backgroundColor: Colors.brand700,
    borderRadius: Radius.button,
    flexDirection: "row",
    gap: 6,
    height: Layout.touchTargetMin - 8,
    justifyContent: "center",
    marginTop: 4
  },
  ctaText: {
    color: Colors.surface,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl
  },
  emptyText: {
    color: Colors.text3,
    fontSize: FontSize.base,
    textAlign: "center"
  }
});
