import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getProblemCategories, type ProblemCategory } from "../../src/api/problems";
import { useRefreshControlProps } from "../../src/hooks/useRefreshControlProps";
import { useSecureScreen } from "../../src/hooks/useSecureScreen";
import { useI18n } from "../../src/i18n/I18nContext";
import { EmptyState, SearchBar } from "../components/ui";
import { FlatCard, ScreenCanvas, ScreenLoader, StackScreenHeader } from "../components/layout";
import { useScreenTopEdges } from "../hooks/useScreenTopEdges";
import { Colors, FontSize, FontWeight, Layout, Radius, Spacing } from "../lib/theme";
import { useStackBottomInset } from "../../src/hooks/useStackBottomInset";

export default function ProblemsCatalogScreen() {
  useSecureScreen();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const topEdges = useScreenTopEdges();
  const stackBottom = useStackBottomInset();
  const refreshControlProps = useRefreshControlProps();
  const [categories, setCategories] = useState<ProblemCategory[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setCategories(await getProblemCategories());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("problems.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  const filtered = categories.filter((row) => {
    if (!query.trim()) return true;
    const hay = `${row.code} ${row.name}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  return (
    <SafeAreaView style={styles.screen} edges={topEdges}>
      <ScreenCanvas />
      <StackScreenHeader
        title={t("problems.title")}
        subtitle={t("problems.subtitle")}
        onBack={() => navigation.goBack()}
        includeSafeTop={false}
      />

      {loading && !refreshing ? (
        <ScreenLoader />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: stackBottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...refreshControlProps} />
          }
        >
          <SearchBar value={query} onChangeText={setQuery} placeholder={t("problems.searchPlaceholder")} />

          {error ? (
            <EmptyState
              icon="alert-circle-outline"
              title={t("problems.loadError")}
              subtitle={error}
              action={t("problems.retry")}
              onAction={() => {
                setLoading(true);
                void load();
              }}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="leaf-outline"
              title={t("problems.emptyTitle")}
              subtitle={t("problems.emptySubtitle")}
            />
          ) : (
            filtered.map((row) => (
              <FlatCard key={row.id} padded={false} style={styles.row}>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeText}>{row.code}</Text>
                </View>
                <Text style={styles.rowName}>{row.name}</Text>
              </FlatCard>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: Colors.bg,
    flex: 1
  },
  scrollView: {
    flex: 1
  },
  scroll: {
    gap: Spacing.sm,
    padding: Spacing.screen
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.cardLg
  },
  codeBadge: {
    backgroundColor: Colors.brand50,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs
  },
  codeText: {
    color: Colors.brand700,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold
  },
  rowName: {
    color: Colors.text1,
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    lineHeight: 22
  }
});
