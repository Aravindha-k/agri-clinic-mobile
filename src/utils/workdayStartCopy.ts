/** Localized copy for Start Workday location gate alerts. */
export function workdayStartGateCopy(t: (key: string) => string) {
  return {
    title: t("workdayUx.gateTitle"),
    permissionBody: t("workdayUx.permissionBody"),
    permissionBlockedBody: t("workdayUx.permissionBlockedBody"),
    servicesOffBody: t("workdayUx.servicesOffBody"),
    timeoutBody: t("workdayUx.locationTimeout"),
    allowLocation: t("workdayUx.allowLocation"),
    openSettings: t("workdayUx.openSettings"),
    openLocationSettings: t("workdayUx.openLocationSettings"),
    tryAgain: t("workdayUx.tryAgain"),
    cancel: t("common.cancel")
  };
}
