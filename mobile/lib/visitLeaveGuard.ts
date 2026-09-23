import { Alert } from "react-native";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * User-facing leave choices for an unfinished visit: Continue or Cancel.
 * Internal draft persistence is unchanged — this only removes Save Draft UI.
 */
export function presentUnfinishedVisitLeaveDialog(options: {
  t: Translate;
  onContinue: () => void;
  onCancelConfirmed: () => void;
}) {
  const { t, onContinue, onCancelConfirmed } = options;
  Alert.alert(t("visitFlow.leaveVisitTitle"), t("visitFlow.leaveVisitBody"), [
    {
      text: t("visitFlow.continueVisit"),
      style: "cancel",
      onPress: onContinue
    },
    {
      text: t("visitFlow.cancelVisit"),
      style: "destructive",
      onPress: () => {
        Alert.alert(t("visitFlow.cancelVisitConfirmTitle"), t("visitFlow.cancelVisitConfirmBody"), [
          {
            text: t("visitFlow.continueVisit"),
            style: "cancel",
            onPress: onContinue
          },
          {
            text: t("visitFlow.cancelVisit"),
            style: "destructive",
            onPress: onCancelConfirmed
          }
        ]);
      }
    }
  ]);
}
