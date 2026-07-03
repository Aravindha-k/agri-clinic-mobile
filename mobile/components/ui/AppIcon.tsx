import type { LucideIcon } from "lucide-react-native";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  Leaf,
  MapPin,
  Sun,
  Users,
  Wind
} from "lucide-react-native";
import type { FieldWeather } from "../../../src/hooks/useFieldWeather";

export type AppIconName =
  | "bell"
  | "users"
  | "clipboard"
  | "alert"
  | "map"
  | "leaf"
  | "check"
  | "droplets"
  | "wind"
  | "sun"
  | "cloud"
  | "cloud-sun"
  | "cloud-rain";

const MAP: Record<AppIconName, LucideIcon> = {
  bell: Bell,
  users: Users,
  clipboard: ClipboardList,
  alert: AlertTriangle,
  map: MapPin,
  leaf: Leaf,
  check: CheckCircle2,
  droplets: Droplets,
  wind: Wind,
  sun: Sun,
  cloud: Cloud,
  "cloud-sun": CloudSun,
  "cloud-rain": CloudRain
};

type Props = {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function AppIcon({ name, size = 22, color = "#0F6B43", strokeWidth = 2 }: Props) {
  const Icon = MAP[name];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

export function weatherIconForCode(code: number): AppIconName {
  if (code === 0) return "sun";
  if (code <= 3) return "cloud-sun";
  if (code <= 48) return "cloud";
  if (code <= 99) return "cloud-rain";
  return "cloud";
}

export function LucideGlyph({
  icon: Icon,
  size = 22,
  color = "#0F6B43",
  strokeWidth = 2,
  fill
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  return <Icon size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;
}

export type { FieldWeather };
