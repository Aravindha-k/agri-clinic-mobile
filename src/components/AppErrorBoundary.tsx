import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackScreen } from "./AppFallbackScreen";
import { requestNavigateHome } from "../navigation/navigationRecovery";
import { requestGoToLogin } from "../storage/authRecovery";
import { logStartupError } from "../utils/startupDiagnostics";
import { qaLogCrash } from "../utils/qaLog";

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
    logStartupError(`app:${error.message}`);
    qaLogCrash("App", error, info.componentStack ?? undefined);
    console.warn("[AppErrorBoundary]", error.message, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, message: undefined });
    requestNavigateHome();
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
          title="Something went wrong"
          message={`Please try again. The app will stay open.${devHint}`}
          primaryLabel="Retry"
          onPrimary={this.handleRetry}
          secondaryLabel="Go to Home"
          onSecondary={this.handleGoHome}
          tertiaryLabel="Logout"
          onTertiary={this.handleGoToLogin}
        />
      );
    }
    return this.props.children;
  }
}
