import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getProblemCategories, type ProblemCategory } from "../../src/api/problems";
import { useSafeAreaInsetsCompat } from "../../src/hooks/useSafeAreaInsetsCompat";
import { EmptyState, SearchBar } from "../components/ui";
import { EntranceBlocks } from "../components/ui/EntranceBlocks";
import { FadeInSection, entranceListStagger, entranceStagger } from "../components/ui/FadeInSection";
import { ScreenEntranceShell } from "../components/layout";
import { ScreenLoader } from "../components/layout/ScreenLoader";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "../lib/theme";

export default function ProblemsCatalogScreen() {
  const navigation = useNavigation<any>();
  const { top: safeTop } = useSafeAreaInsetsCompat();
  const [categories, setCategories] = useState<ProblemCategory[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setCategories(await getProblemCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load problem catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = categories.filter((row) => {
    if (!query.trim()) return true;
    const hay = `${row.code} ${row.name}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  return (
    <ScreenEntranceShell style={[styles.screen, { paddingTop: safeTop }]}>
      {(entranceTick) => (
        <>
          <FadeInSection replayKey={entranceTick} delay={entranceStagger(0)}>
            <View style={styles.header}>
              <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={18} color={Colors.text1} />
              </Pressable>
              <Text style={styles.headerTitle}>Problem catalog</Text>
              <View style={styles.iconBtn} />
            </View>
          </FadeInSection>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <FadeInSection replayKey={entranceTick} delay={entranceStagger(1)}>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Search categories…" />
            </FadeInSection>

            {loading ? (
              <ScreenLoader style={{ minHeight: 240 }} />
            ) : error ? (
              <EntranceBlocks replayKey={entranceTick} startStep={2}>
                <EmptyState
                  icon="alert-circle-outline"
                  title="Could not load catalog"
                  subtitle={error}
                  action="Retry"
                  onAction={() => void load()}
                />
              </EntranceBlocks>
            ) : filtered.length === 0 ? (
              <EntranceBlocks replayKey={entranceTick} startStep={2}>
                <EmptyState icon="leaf-outline" title="No categories" subtitle="Try a different search." />
              </EntranceBlocks>
            ) : (
              filtered.map((row, index) => (
                <FadeInSection
                  key={row.id}
                  replayKey={entranceTick}
                  delay={entranceListStagger(2, index)}
                  variant="card"
                >
                  <View style={styles.row}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{row.code}</Text>
                    </View>
                    <Text style={styles.rowName}>{row.name}</Text>
                  </View>
                </FadeInSection>
              ))
            )}
          </ScrollView>
        </>
      )}
    </ScreenEntranceShell>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: Colors.bg, flex: 1 },
  scrollView: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingVertical: 10
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  headerTitle: {
    color: Colors.text1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold
  },
  scroll: { gap: 10, padding: Spacing.screen, paddingBottom: 32 },
  row: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  codeBadge: {
    backgroundColor: Colors.brand50,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  codeText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  rowName: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium
  }
});
