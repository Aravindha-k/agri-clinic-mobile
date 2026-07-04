import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackScreen } from "./AppFallbackScreen";
import { requestNavigateHome } from "../navigation/navigationRecovery";
import { requestGoToLogin } from "../storage/authRecovery";
import { logStartupError } from "../utils/startupDiagnostics";

type Props = {
  children: ReactNode;
  screenName?: string;
};

type State = {
  hasError: boolean;
  message?: string;
};

/** Screen-level guard — keeps app open with retry / home / logout. */
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const tag = this.props.screenName ?? "screen";
    logStartupError(`${tag}:${error.message}`);
    console.warn(`[ScreenErrorBoundary:${tag}]`, error.message, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, message: undefined });
    requestNavigateHome();
  };

  private handleLogout = () => {
    this.setState({ hasError: false, message: undefined });
    void requestGoToLogin();
  };

  render() {
    if (this.state.hasError) {
      const devHint = __DEV__ && this.state.message ? `\n\n(${this.state.message})` : "";
      return (
        <AppFallbackScreen
          title="Something went wrong"
          message={`Please try again. The app will stay open.${devHint}`}
          primaryLabel="Retry"
          onPrimary={this.handleRetry}
          secondaryLabel="Go to Home"
          onSecondary={this.handleGoHome}
          tertiaryLabel="Logout"
          onTertiary={this.handleLogout}
        />
      );
    }
    return this.props.children;
  }
}
