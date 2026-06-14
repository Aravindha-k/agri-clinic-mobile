import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getProblemCategories, type ProblemCategory } from "../../src/api/problems";
import { useSafeAreaInsetsCompat } from "../../src/hooks/useSafeAreaInsetsCompat";
import { EmptyState, SearchBar, Skeleton } from "../components/ui";
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
    <View style={[styles.screen, { paddingTop: safeTop }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={18} color={Colors.text1} />
        </Pressable>
        <Text style={styles.headerTitle}>Problem catalog</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search categories…" />

        {loading ? (
          <>
            <Skeleton width="100%" height={56} borderRadius={Radius.card} />
            <Skeleton width="100%" height={56} borderRadius={Radius.card} />
          </>
        ) : error ? (
          <EmptyState icon="alert-circle-outline" title="Could not load catalog" subtitle={error} action="Retry" onAction={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="leaf-outline" title="No categories" subtitle="Try a different search." />
        ) : (
          filtered.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.codeBadge}>
                <Text style={styles.codeText}>{row.code}</Text>
              </View>
              <Text style={styles.rowName}>{row.name}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
