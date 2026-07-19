import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppFallbackScreen } from "./AppFallbackScreen";
import { requestNavigateHome } from "../navigation/navigationRecovery";
import { requestGoToLogin } from "../storage/authRecovery";
import { getApiBuildDiagnostics } from "../api/config";
import { logStartupError } from "../utils/startupDiagnostics";
import { qaLogCrash } from "../utils/qaLog";

type Props = {
  children: ReactNode;
  onError?: (error: unknown) => void;
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
    try {
      this.props.onError?.(error);
    } catch {
      // ignore callback failures
    }
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
      const detail = this.state.message ?? "";
      const isConfigError = /configuration|EXPO_PUBLIC_API_BASE_URL|missing API/i.test(detail);
      const diag = getApiBuildDiagnostics();
      const devHint = __DEV__ && detail ? `\n\n(${detail})` : "";
      const buildHint = `\n\nBuild ${diag.appVersion} · ${diag.gitCommit}`;
      return (
        <AppFallbackScreen
          title={isConfigError ? "The app could not start" : "Something went wrong"}
          message={
            isConfigError
              ? `App configuration error. Reinstall the latest APK from your administrator.${buildHint}${devHint}`
              : `Please try again. The app will stay open.${buildHint}${devHint}`
          }
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
