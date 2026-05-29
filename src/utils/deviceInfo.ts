import Constants from "expo-constants";
import { Platform } from "react-native";

export type DeviceInfoPayload = {
  device_name: string;
  device_model: string;
  platform: string;
  app_version: string;
};

export function getDeviceInfo(): DeviceInfoPayload {
  const expoConfig = Constants.expoConfig;
  const platform =
    Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : Platform.OS;

  const deviceName =
    Constants.deviceName ||
    (Platform.OS === "android" ? "Android device" : Platform.OS === "ios" ? "iPhone" : "Mobile device");

  const deviceModel =
    Constants.platform?.modelName ||
    (Platform.constants as { Model?: string } | undefined)?.Model ||
    deviceName;

  const appVersion = expoConfig?.version || "1.0.0";

  return {
    device_name: String(deviceName).slice(0, 120),
    device_model: String(deviceModel).slice(0, 120),
    platform: String(platform).slice(0, 40),
    app_version: String(appVersion).slice(0, 40)
  };
}
