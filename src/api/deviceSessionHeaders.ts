import { DEVICE_SESSION_HEADER } from "../constants/deviceSession";
import { getDeviceSessionId } from "../storage/deviceSessionStorage";

export async function applyDeviceSessionHeader(headers: Headers) {
  const sessionId = await getDeviceSessionId();
  if (sessionId) {
    headers.set(DEVICE_SESSION_HEADER, sessionId);
  }
}

export async function getDeviceSessionHeaderEntries(): Promise<Record<string, string>> {
  const sessionId = await getDeviceSessionId();
  if (!sessionId) return {};
  return { [DEVICE_SESSION_HEADER]: sessionId };
}
