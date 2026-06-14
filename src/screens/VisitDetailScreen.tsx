import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getVisit, Visit } from "../api/visits";
import { AppCard } from "../components/AppCard";
import { ErrorState } from "../components/ErrorState";
import { FadeInView } from "../components/FadeInView";
import { ListSkeleton } from "../components/ListSkeleton";
import { useStackHeaderBack } from "../navigation/stackHeaderBack";
import { VisitsStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";
import { formatDisplayDateTime } from "../utils/format";
import { formatVisitCropLine, formatVisitPlaceLine } from "../utils/visitStatus";
import { normalizeVisitFromApi, resolveVisitFarmer } from "../utils/visitFarmer";
import { Screen, SectionHeader, styles as shared } from "./shared";

type Props = NativeStackScreenProps<VisitsStackParamList, "VisitDetail">;

export function VisitDetailScreen({ route, navigation }: Props) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useStackHeaderBack(navigation, "VisitsList");

  const load = useCallback(async () => {
    try {
      setError("");
      setVisit(normalizeVisitFromApi(await getVisit(route.params.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load visit.");
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [load, navigation]);

  useLayoutEffect(() => {
    const name = visit ? resolveVisitFarmer(visit).name : "";
    navigation.setOptions({ title: name && name !== "—" ? name : "Visit" });
  }, [navigation, visit]);

  if (loading) {
    return (
      <Screen>
        <ListSkeleton rows={3} />
      </Screen>
    );
  }
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!visit) return null;

  const farmer = resolveVisitFarmer(visit);
  const hasGps = Boolean(visit.latitude && visit.longitude);
  const placeLine =
    farmer.village !== "—"
      ? [farmer.village, farmer.district !== "—" ? farmer.district : null].filter(Boolean).join(", ")
      : formatVisitPlaceLine(visit);

  return (
    <Screen>
      <FadeInView>
        <AppCard elevated>
          <Text style={styles.metaSmall}>{formatDisplayDateTime(visit.created_at)}</Text>
          <Text style={styles.heroTitle}>{farmer.name !== "—" ? farmer.name : "Farmer"}</Text>
          <Text style={styles.heroMeta}>{farmer.phone !== "—" ? farmer.phone : "Not provided"}</Text>
        </AppCard>

        <AppCard elevated>
          <SectionHeader title="Location / land" />
          <Text style={shared.label}>Village / district</Text>
          <Text style={shared.value}>{placeLine}</Text>
          <Text style={[shared.label, shared.labelSpacer]}>Land</Text>
          <Text style={shared.value}>
            {visit.land_name?.trim() || "Not provided"}
            {visit.land_area ? ` · ${visit.land_area}` : ""}
          </Text>
        </AppCard>

        <AppCard elevated>
          <SectionHeader title="Crop" />
          <Text style={shared.value}>
            {farmer.cropName !== "—" ? farmer.cropName : formatVisitCropLine(visit, "Not provided")}
          </Text>
        </AppCard>

        <AppCard elevated>
          <SectionHeader title="Field record" />
          <AdviceRow label="Field notes" value={visit.field_notes || visit.general_advice} emptyLabel="Not added by employee" />
          <AdviceRow label="Problem Seen" value={visit.problem_seen} emptyLabel="Not added by employee" />
          <AdviceRow label="Action Taken" value={visit.action_taken} emptyLabel="Not added by employee" />
          <AdviceRow label="Follow-up Date" value={visit.follow_up_date || visit.next_visit_date} emptyLabel="Not added by employee" />
        </AppCard>

        <AppCard elevated>
          <SectionHeader title="Field location" subtitle="Recorded with this visit" />
          <View style={styles.gpsRow}>
            <Ionicons name={hasGps ? "checkmark-circle" : "ellipse-outline"} size={22} color={hasGps ? colors.success : colors.muted} />
            <Text style={shared.value}>{hasGps ? "Location recorded" : "Not recorded"}</Text>
          </View>
        </AppCard>
      </FadeInView>
    </Screen>
  );
}

function AdviceRow({
  label,
  value,
  emptyLabel = "Not added by employee"
}: {
  label: string;
  value?: string | null;
  emptyLabel?: string;
}) {
  const text = value?.trim() ? value.trim() : emptyLabel;
  return (
    <View style={styles.adviceBlock}>
      <Text style={shared.label}>{label}</Text>
      <Text style={[shared.value, !value?.trim() && { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metaSmall: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: space.sm + 2
  },
  heroMeta: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: space.xs + 2
  },
  flagsLabel: {
    marginTop: space.sm + 2
  },
  gpsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: space.xs
  },
  adviceBlock: {
    marginBottom: space.sm + 2
  }
});
