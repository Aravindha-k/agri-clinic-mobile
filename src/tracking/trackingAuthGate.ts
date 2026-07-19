import { canSendAuthenticatedRequests, getAuthPhase } from "../storage/authPhase";
import { getAccessToken } from "../storage/tokenStorage";
import { getDeviceSessionId } from "../storage/deviceSessionStorage";
import { trackingDevLog } from "./trackingDevLog";

export type TrackingAuthGate = {
  ready: boolean;
  reason?: string;
};

/**
 * Tracking/sync must not fire while locked or without concrete credentials.
 * Missing auth → defer (keep queue); never send token=no requests.
 */
export async function assertTrackingAuthReady(source: string): Promise<TrackingAuthGate> {
  if (!canSendAuthenticatedRequests()) {
    const reason = `phase=${getAuthPhase()}`;
    trackingDevLog("tracking_deferred_auth_not_ready", `${source} ${reason}`);
    return { ready: false, reason };
  }
  const [token, deviceSession] = await Promise.all([getAccessToken(), getDeviceSessionId()]);
  if (!token || !deviceSession) {
    const reason = `tokenPresent=${Boolean(token)} deviceSessionPresent=${Boolean(deviceSession)}`;
    trackingDevLog("tracking_deferred_auth_not_ready", `${source} ${reason}`);
    return { ready: false, reason };
  }
  return { ready: true };
}
