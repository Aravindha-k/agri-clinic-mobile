import { Alert, Linking } from "react-native";

/**
 * Media permission denied UX.
 * Retryable denial (canAskAgain !== false): plain explanation — the OS prompt
 * can still be shown on the next attempt.
 * Permanent denial (canAskAgain === false): offer an explicit Open Settings
 * action. Settings is only opened after the user taps — never automatically.
 */
export function alertMediaPermissionDenied(options: {
  title: string;
  message: string;
  canAskAgain: boolean | undefined;
}) {
  if (options.canAskAgain === false) {
    Alert.alert(options.title, options.message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          void Linking.openSettings();
        }
      }
    ]);
    return;
  }
  Alert.alert(options.title, options.message);
}
