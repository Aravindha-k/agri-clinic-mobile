import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackScreen } from "./AppFallbackScreen";
import { requestGoToLogin } from "../storage/authRecovery";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.warn("[AppErrorBoundary]", error.message, info.componentStack);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleGoToLogin = () => {
    this.setState({ hasError: false });
    void requestGoToLogin();
  };

  render() {
    if (this.state.hasError) {
      return (
        <AppFallbackScreen
          title="We hit a snag"
          message="Something unexpected happened. You can try again or sign in again — the app will stay open."
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
