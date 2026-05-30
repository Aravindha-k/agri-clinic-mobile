import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useWorkdayTimer } from "../../hooks/useLiveClock";
import { useTheme } from "../../theme";
import { space } from "../../theme/layout";
import { PrimaryButton } from "../ui/PrimaryButton";
import { PremiumCard } from "../brand/PremiumCard";

type Props = {
  isActive: boolean;
  startedAt: string | null;
  lastSyncTime: string | null;
  nextSyncAt: string | null;
  busy: boolean;
  elapsedLabel?: string;
  onStart: () => void;
  onLiveMap: () => void;
};

function formatSyncTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

export function WorkdayStatusCard({
  isActive,
  startedAt,
  lastSyncTime,
  nextSyncAt,
  busy,
  elapsedLabel,
  onStart,
  onLiveMap
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const timer = useWorkdayTimer(startedAt, isActive);

  if (!isActive) {
    return (
      <PremiumCard elevated tint="soft" style={{ ...styles.card, borderLeftColor: c.primary }}>
        <View style={styles.idleHeader}>
          <View style={[styles.idleIcon, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="sunny-outline" size={20} color={c.primaryDark} />
          </View>
          <View style={styles.idleText}>
            <Text style={[styles.idleTitle, { color: c.text }]}>Ready for the field?</Text>
            <Text style={[styles.idleHint, { color: c.muted }]}>
              Start your workday to begin GPS tracking and today's timer.
            </Text>
          </View>
        </View>
        <PrimaryButton title="Start work today" onPress={onStart} loading={busy} style={styles.startBtn} />
      </PremiumCard>
    );
  }

  return (
    <PremiumCard elevated tint="soft" style={{ ...styles.card, borderLeftColor: c.success }}>
      <View style={styles.activeTop}>
        <View style={[styles.statusPill, { backgroundColor: c.successSoft }]}>
          <View style={[styles.pulseDot, { backgroundColor: c.success }]} />
          <Text style={[styles.statusText, { color: c.success }]}>On duty</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onLiveMap}
          style={({ pressed }) => [styles.mapLink, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="navigate-outline" size={15} color={c.primaryDark} />
          <Text style={[styles.mapLinkText, { color: c.primaryDark }]}>Live map</Text>
        </Pressable>
      </View>

      <View style={[styles.timerShell, { backgroundColor: c.cardMuted, borderColor: c.border }]}>
        <Text style={[styles.timerValue, { color: c.primaryDark }]} adjustsFontSizeToFit numberOfLines={1}>
          {timer.display}
        </Text>
        <Text style={[styles.timerCaption, { color: c.muted }]}>
          {elapsedLabel ? `Active · ${elapsedLabel}` : "Today's field time"}
        </Text>
      </View>

      <View style={[styles.syncRow, { borderTopColor: c.border }]}>
        <View style={styles.syncItem}>
          <Text style={[styles.syncLabel, { color: c.muted }]}>Last sync</Text>
          <Text style={[styles.syncValue, { color: c.text }]}>{formatSyncTime(lastSyncTime)}</Text>
        </View>
        <View style={[styles.syncDivider, { backgroundColor: c.border }]} />
        <View style={styles.syncItem}>
          <Text style={[styles.syncLabel, { color: c.muted }]}>Next sync</Text>
          <Text style={[styles.syncValue, { color: c.text }]}>{formatSyncTime(nextSyncAt)}</Text>
        </View>
      </View>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    borderRadius: 18,
    gap: 0,
    paddingVertical: 2
  },
  idleHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: space.md
  },
  idleIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  idleText: {
    flex: 1,
    minWidth: 0
  },
  idleTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  idleHint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  startBtn: {
    marginTop: space.md + 2
  },
  activeTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  pulseDot: {
    borderRadius: 99,
    height: 7,
    width: 7
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2
  },
  mapLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  mapLinkText: {
    fontSize: 12,
    fontWeight: "700"
  },
  timerShell: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  timerValue: {
    fontSize: 24,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
    letterSpacing: 0.5,
    lineHeight: 28,
    maxWidth: "100%"
  },
  timerCaption: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3
  },
  syncRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 12
  },
  syncItem: {
    flex: 1
  },
  syncLabel: {
    fontSize: 11,
    fontWeight: "600"
  },
  syncValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2
  },
  syncDivider: {
    alignSelf: "stretch",
    marginHorizontal: 12,
    width: StyleSheet.hairlineWidth
  }
});
