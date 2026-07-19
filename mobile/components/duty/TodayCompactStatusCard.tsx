import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../../src/i18n/I18nContext";
import { formatShortTime } from "../../lib/format";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../../lib/theme";
import { TODAY_PAGE_PAD } from "../../lib/todayLayout";
import { PrimaryButton } from "../ui";

type Props = {
  startedAt?: string | null;
  expectedEndAt?: string | null;
  statusLabel: string;
  onOpenDay: () => void;
};

/** Compact workday status — no live timer, sync badges, or extra icons. */
export function TodayCompactStatusCard({
  startedAt,
  expectedEndAt,
  statusLabel,
  onOpenDay
}: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeLabel}>{statusLabel}</Text>
        </View>
        <PrimaryButton
          label={t("home.openTracking")}
          onPress={onOpenDay}
          style={styles.dayBtn}
          accessibilityLabel={t("home.openTracking")}
        />
      </View>

      <View style={styles.grid}>
        <MetaCell label="Started" value={formatShortTime(startedAt)} />
        <MetaCell label="Expected end" value={formatShortTime(expectedEndAt)} />
      </View>
    </View>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.brand100,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
    marginHorizontal: TODAY_PAGE_PAD,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "space-between"
  },
  activeBadge: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
    minWidth: 0
  },
  activeDot: {
    backgroundColor: Colors.green,
    borderRadius: 5,
    height: 8,
    width: 8
  },
  activeLabel: {
    color: Colors.greenText,
    flexShrink: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  dayBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  grid: {
    flexDirection: "row",
    gap: Spacing.sm
  },
  metaCell: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.inner,
    flex: 1,
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm
  },
  metaLabel: {
    color: Colors.text3,
    fontSize: 11,
    fontWeight: FontWeight.medium
  },
  metaValue: {
    color: Colors.text1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold
  }
});
