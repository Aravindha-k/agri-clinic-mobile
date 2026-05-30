import { DEVICE_SESSION_HEADER } from "../constants/deviceSession";
import { getDeviceSessionId } from "../storage/deviceSessionStorage";

export async function applyDeviceSessionHeader(headers: Headers): Promise<boolean> {
  const sessionId = await getDeviceSessionId();
  if (sessionId) {
    headers.set(DEVICE_SESSION_HEADER, sessionId);
    return true;
  }
  return false;
}

export async function getDeviceSessionHeaderEntries(): Promise<Record<string, string>> {
  const sessionId = await getDeviceSessionId();
  if (!sessionId) return {};
  return { [DEVICE_SESSION_HEADER]: sessionId };
}
