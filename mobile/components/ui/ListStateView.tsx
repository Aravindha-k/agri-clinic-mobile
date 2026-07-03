import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Spacing } from "../../lib/theme";
import { EmptyState } from "./EmptyState";

export type ListStateKind = "empty" | "error" | "offline" | "noResults";

const STATE_META: Record<
  ListStateKind,
  { icon: keyof typeof Ionicons.glyphMap; defaultTitle: string }
> = {
  empty: { icon: "folder-open-outline", defaultTitle: "Nothing here yet" },
  error: { icon: "alert-circle-outline", defaultTitle: "Something went wrong" },
  offline: { icon: "cloud-offline-outline", defaultTitle: "You're offline" },
  noResults: { icon: "search-outline", defaultTitle: "No results found" }
};

type Props = {
  kind: ListStateKind;
  title?: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: ViewStyle;
};

/** Unified list empty / error / offline / no-results layout. */
export function ListStateView({ kind, title, subtitle, action, onAction, compact, style }: Props) {
  const meta = STATE_META[kind];
  return (
    <View style={[compact ? styles.compact : styles.wrap, style]}>
      <EmptyState
        icon={meta.icon}
        title={title ?? meta.defaultTitle}
        subtitle={subtitle}
        action={action}
        onAction={onAction}
        compact={compact}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.xxxl
  },
  compact: {
    paddingVertical: Spacing.xl
  }
});
