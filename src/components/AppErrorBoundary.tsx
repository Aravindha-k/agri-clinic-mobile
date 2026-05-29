import { Ionicons } from "@expo/vector-icons";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { space } from "../theme/layout";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unexpected error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[AppErrorBoundary]", error.message, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Ionicons name="warning-outline" size={40} color={colors.warning} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. You can try again without closing the app.
          </Text>
          <Pressable accessibilityRole="button" onPress={this.handleRetry} style={styles.btn}>
            <Text style={styles.btnText}>Try again</Text>
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
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    padding: space.xl
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: space.md,
    textAlign: "center"
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: space.sm,
    textAlign: "center"
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: space.lg,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  }
});
