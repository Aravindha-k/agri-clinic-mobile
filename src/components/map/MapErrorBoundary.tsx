import { Ionicons } from "@expo/vector-icons";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CompanyLogo } from "../brand/CompanyLogo";

type Props = {
  children: ReactNode;
  height: number;
  screenName?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
};

type State = { hasError: boolean };

const DEFAULT_MESSAGE =
  "Map is temporarily unavailable.\nYour route and visit data are still being recorded.";

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Never expose raw exception text to employees.
    console.warn(
      `[MapErrorBoundary:${this.props.screenName ?? "unknown"}]`,
      error.message,
      info.componentStack
    );
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.fallback, { minHeight: Math.max(this.props.height, 220) }]}>
          <CompanyLogo size={48} />
          <Text style={styles.title}>Map unavailable</Text>
          <Text style={styles.body}>{this.props.fallbackMessage ?? DEFAULT_MESSAGE}</Text>
          <Pressable onPress={this.handleRetry} style={styles.retryBtn} accessibilityRole="button">
            <Ionicons name="refresh-outline" size={16} color="#1F7A4F" />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: "#e8f0ea",
    borderRadius: 18,
    justifyContent: "center",
    padding: 20
  },
  title: {
    color: "#122018",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center"
  },
  body: {
    color: "#6B7F74",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center"
  },
  retryBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: {
    color: "#1F7A4F",
    fontSize: 14,
    fontWeight: "700"
  }
});
