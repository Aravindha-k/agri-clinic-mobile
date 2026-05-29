import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  children: ReactNode;
  height: number;
  fallbackMessage?: string;
};

type State = { hasError: boolean };

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.warn("[MapErrorBoundary]", error.message, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.fallback, { height: this.props.height }]}>
          <Ionicons name="map-outline" size={32} color="#6B7F74" />
          <Text style={styles.title}>Map unavailable</Text>
          <Text style={styles.body}>
            {this.props.fallbackMessage ??
              "Location not available. Please enable GPS and try again."}
          </Text>
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
