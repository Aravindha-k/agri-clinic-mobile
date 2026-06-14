import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackScreen } from "./AppFallbackScreen";
import { requestGoToLogin } from "../storage/authRecovery";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error("[AppErrorBoundary]", error.message, info.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  private handleGoToLogin = () => {
    this.setState({ hasError: false, message: undefined });
    void requestGoToLogin();
  };

  render() {
    if (this.state.hasError) {
      const detail = this.state.message;
      const devHint = __DEV__ && detail ? `\n\n(${detail})` : "";
      return (
        <AppFallbackScreen
          title="We hit a snag"
          message={`Something unexpected happened. You can try again or sign in again — the app will stay open.${devHint}`}
          primaryLabel="Try again"
          onPrimary={this.handleRetry}
          secondaryLabel="Go to login"
          onSecondary={this.handleGoToLogin}
        />
      );
    }
    return this.props.children;
  }
}
