import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nContext";
import { formatShortTime } from "../../../mobile/lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../../mobile/lib/theme";
import type { MyLocationVisitRow } from "../../hooks/useMyLocationScreen";

type Props = {
  visits: MyLocationVisitRow[];
  distanceKm: string;
  visitCount: number;
  onSelectVisit: (visit: MyLocationVisitRow) => void;
};

export const MyLocationBottomSheet = memo(function MyLocationBottomSheet({
  visits,
  distanceKm,
  visitCount,
  onSelectVisit
}: Props) {
  const { t } = useI18n();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["32%", "58%"], []);

  const renderItem = useCallback(
    ({ item }: { item: MyLocationVisitRow }) => (
      <Pressable
        onPress={() => onSelectVisit(item)}
        style={({ pressed }) => [styles.visitRow, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.checkCircle}>
          <Ionicons color={Colors.surface} name="checkmark" size={14} />
        </View>
        <View style={styles.visitMain}>
          <Text style={styles.visitTime}>
            {item.visitedAt ? formatShortTime(item.visitedAt) : "—"}
          </Text>
          <Text style={styles.visitName}>{item.farmerName}</Text>
          <Text style={styles.visitVillage}>{item.village}</Text>
        </View>
        <View style={styles.visitEnd}>
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{item.statusLabel}</Text>
          </View>
          <Ionicons color={Colors.text4} name="chevron-forward" size={18} />
        </View>
      </Pressable>
    ),
    [onSelectVisit]
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.header}>
        <View style={styles.handle} />
        <View style={styles.summaryHead}>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>{t("myLocation.todaysSummary")}</Text>
            <Text style={styles.summaryBody}>
              {t("myLocation.summaryCompleted", { visits: visitCount, distance: distanceKm })}
            </Text>
          </View>
          {visits.length > 0 ? (
            <Pressable onPress={() => sheetRef.current?.snapToIndex(1)} style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>{t("myLocation.viewAllVisits")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    ),
    [distanceKm, t, visitCount, visits.length]
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={0} snapPoints={snapPoints} enablePanDownToClose={false} backgroundStyle={styles.sheet}>
      <BottomSheetFlatList
        data={visits}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyVisits}>{t("myLocation.noVisitsToday")}</Text>
        }
      />
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card
  },
  header: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm
  },
  handle: {
    alignSelf: "center",
    backgroundColor: Colors.border,
    borderRadius: 3,
    height: 4,
    marginBottom: Spacing.xs,
    width: 40
  },
  summaryHead: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  summaryTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  summaryBody: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  viewAllBtn: {
    borderColor: Colors.brand700,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8
  },
  viewAllText: {
    color: Colors.brand700,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  },
  listContent: {
    paddingBottom: Spacing.xl
  },
  visitRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md
  },
  checkCircle: {
    alignItems: "center",
    backgroundColor: Colors.green,
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  visitMain: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  visitTime: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium
  },
  visitName: {
    color: Colors.text1,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold
  },
  visitVillage: {
    color: Colors.text3,
    fontSize: FontSize.sm
  },
  visitEnd: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  completedBadge: {
    backgroundColor: Colors.greenBg,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  completedText: {
    color: Colors.greenText,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  },
  emptyVisits: {
    color: Colors.text3,
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md
  }
});
