import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getProductionDiagnosticsSnapshot,
  runBackendSmokeTest,
  type BackendSmokeResult
} from "../../../src/utils/productionApiDiagnostics";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";

type Props = {
  compact?: boolean;
};

export function ProductionApiDiagnosticsPanel({ compact = false }: Props) {
  const snapshot = getProductionDiagnosticsSnapshot();
  const [smoke, setSmoke] = useState<BackendSmokeResult[] | null>(snapshot.lastSmokeResults);
  const [smokeBusy, setSmokeBusy] = useState(false);

  const runSmoke = useCallback(async () => {
    setSmokeBusy(true);
    try {
      setSmoke(await runBackendSmokeTest());
    } finally {
      setSmokeBusy(false);
    }
  }, []);

  useEffect(() => {
    void runSmoke();
  }, [runSmoke]);

  return (
    <View style={[styles.panel, compact && styles.panelCompact]}>
      <Text style={styles.title}>Production connectivity</Text>
      <DiagRow label="API base" value={snapshot.apiBaseUrl} />
      <DiagRow label="Login URL" value={snapshot.loginUrl} />
      <DiagRow label="Media origin" value={snapshot.mediaOrigin} />
      <DiagRow label="Cleartext HTTP" value="enabled (13.207.17.117)" />
      {snapshot.lastFailure ? (
        <>
          <DiagRow label="Last failed URL" value={snapshot.lastFailure.url} warn />
          <DiagRow
            label="Last error"
            value={`${snapshot.lastFailure.status ?? "network"} — ${snapshot.lastFailure.message}`}
            warn
          />
        </>
      ) : (
        <DiagRow label="Last API error" value="None recorded this session" />
      )}

      <Pressable onPress={() => void runSmoke()} style={styles.smokeBtn} disabled={smokeBusy}>
        {smokeBusy ? (
          <ActivityIndicator color={Colors.brand700} size="small" />
        ) : (
          <Text style={styles.smokeBtnText}>Re-run backend smoke test</Text>
        )}
      </Pressable>

      {smoke?.length ? (
        <View style={styles.smokeBlock}>
          {smoke.map((row) => (
            <Text key={row.url} style={[styles.smokeLine, !row.ok && styles.smokeFail]}>
              {row.ok ? "OK" : "FAIL"} {row.status ?? "—"} {row.url} ({row.ms}ms)
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DiagRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, warn && styles.valueWarn]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md
  },
  panelCompact: {
    marginHorizontal: 0
  },
  title: {
    color: Colors.text2,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase"
  },
  row: {
    gap: 2
  },
  label: {
    color: Colors.text4,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold
  },
  value: {
    color: Colors.text2,
    fontSize: FontSize.xs,
    lineHeight: 16
  },
  valueWarn: {
    color: Colors.amber
  },
  smokeBtn: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    paddingVertical: 8
  },
  smokeBtnText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold
  },
  smokeBlock: {
    gap: 4,
    marginTop: 4
  },
  smokeLine: {
    color: Colors.text3,
    fontSize: FontSize.xs,
    lineHeight: 16
  },
  smokeFail: {
    color: Colors.amber
  }
});
