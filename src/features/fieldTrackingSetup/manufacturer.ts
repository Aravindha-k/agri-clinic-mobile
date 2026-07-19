import { Platform } from "react-native";
import Constants from "expo-constants";
import type { ManufacturerFamily } from "./types";

function rawManufacturer(): string {
  const c = Platform.constants as Record<string, unknown> | undefined;
  const brand = String(c?.Brand ?? c?.Manufacturer ?? Constants.platform?.ios?.model ?? "").toLowerCase();
  const model = String(Constants.deviceName ?? c?.Model ?? "").toLowerCase();
  return `${brand} ${model}`;
}

/** Best-effort OEM family for employee-facing guidance. */
export function detectManufacturerFamily(): ManufacturerFamily {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS !== "android") return "unknown";

  const raw = rawManufacturer();

  if (
    raw.includes("xiaomi") ||
    raw.includes("redmi") ||
    raw.includes("poco") ||
    raw.includes("blackshark")
  ) {
    return "xiaomi";
  }
  if (raw.includes("oppo")) return "oppo";
  if (raw.includes("realme")) return "realme";
  if (raw.includes("vivo") || raw.includes("iqoo")) return "vivo";
  if (raw.includes("samsung")) return "samsung";
  if (raw.includes("oneplus") || raw.includes("op")) {
    // OnePlus often reports "OnePlus"
    if (raw.includes("oneplus")) return "oneplus";
  }
  if (raw.includes("motorola") || raw.includes("moto")) return "motorola";
  if (raw.includes("oneplus")) return "oneplus";

  return "other";
}

export type OemGuidance = {
  title: string;
  bullets: string[];
};

export function getOemGuidance(family: ManufacturerFamily): OemGuidance {
  switch (family) {
    case "xiaomi":
      return {
        title: "Xiaomi / Redmi / POCO",
        bullets: [
          "Open Battery saver → choose No restrictions",
          "Turn Autostart ON for Kavya Field"
        ]
      };
    case "oppo":
    case "realme":
      return {
        title: family === "realme" ? "Realme" : "Oppo",
        bullets: ["Allow background activity", "Allow auto launch"]
      };
    case "vivo":
      return {
        title: "Vivo / iQOO",
        bullets: ["Background power consumption → Allow", "Turn Autostart ON"]
      };
    case "samsung":
      return {
        title: "Samsung",
        bullets: [
          "Battery → set Kavya Field to Unrestricted",
          "Remove Kavya Field from Sleeping apps if listed"
        ]
      };
    case "oneplus":
      return {
        title: "OnePlus",
        bullets: ["Battery optimization → Don’t optimize", "Allow background activity"]
      };
    case "motorola":
      return {
        title: "Motorola",
        bullets: ["Battery → Unrestricted", "Allow background activity"]
      };
    case "ios":
      return {
        title: "iPhone",
        bullets: ["Set Location to Always", "Keep Precise Location ON"]
      };
    default:
      return {
        title: "Your phone",
        bullets: [
          "Set battery usage to Unrestricted / No restrictions",
          "Allow the app to run in the background"
        ]
      };
  }
}
