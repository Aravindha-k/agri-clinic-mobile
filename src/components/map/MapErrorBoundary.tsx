import { Ionicons } from "@expo/vector-icons";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  children: ReactNode;
  height: number;
  screenName?: string;
  fallbackMessage?: string;
};

type State = { hasError: boolean };

const DEFAULT_MESSAGE = "Map could not load. Please enable GPS and try again.";

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[MapErrorBoundary:${this.props.screenName ?? "unknown"}]`, error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.fallback, { minHeight: Math.max(this.props.height, 220) }]}>
          <Ionicons name="map-outline" size={32} color="#6B7F74" />
          <Text style={styles.title}>Map unavailable</Text>
          <Text style={styles.body}>{this.props.fallbackMessage ?? DEFAULT_MESSAGE}</Text>
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
  }
});
