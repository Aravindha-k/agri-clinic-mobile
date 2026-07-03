import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../../lib/theme";

export type AgriIconFamily = "ionicons" | "mci";

export type AgriProductIconDef = {
  key: string;
  family: AgriIconFamily;
  name: string;
  color: string;
  /** Maps to Kavya Agri Clinic field services (see company profile). */
  service: string;
};

/**
 * Five orbit icons — reference mock.
 */
export const AGRI_ORBIT_ICONS: AgriProductIconDef[] = [
  {
    key: "leaf",
    family: "ionicons",
    name: "leaf",
    color: "#2E9B64",
    service: "Crop health"
  },
  {
    key: "spray",
    family: "mci",
    name: "spray-bottle",
    color: "#6B4E2E",
    service: "Crop protection"
  },
  {
    key: "seed",
    family: "mci",
    name: "seed-outline",
    color: "#8B6914",
    service: "Quality seeds"
  },
  {
    key: "lab",
    family: "mci",
    name: "flask-outline",
    color: "#1A6B7C",
    service: "Diagnostics"
  },
  {
    key: "tractor",
    family: "mci",
    name: "tractor",
    color: "#0F6B43",
    service: "Field operations"
  }
];

/** Orbiting pair when hero flanks are shown — seed above, protection below. */
export const AGRI_ORBIT_RING_ICONS = AGRI_ORBIT_ICONS.filter(
  (icon) => icon.key === "seed" || icon.key === "spray"
);

export type BrandFlankService = {
  key: string;
  side: "left" | "right";
  icon: AgriProductIconDef;
  stamp: string;
  label: string;
  accent: string;
  accentSoft: string;
  tiltDeg: number;
};

/** Static clinic seals flanking the hero logo — inspection & crop prescription. */
export const BRAND_SERVICE_FLANKS: BrandFlankService[] = [
  {
    key: "inspection",
    side: "left",
    icon: AGRI_ORBIT_ICONS[3],
    stamp: "FIELD",
    label: "Inspect",
    accent: Colors.brand700,
    accentSoft: "rgba(15, 107, 67, 0.12)",
    tiltDeg: -5
  },
  {
    key: "prescription",
    side: "right",
    icon: {
      key: "prescription",
      family: "mci",
      name: "prescription",
      color: "#1A6B7C",
      service: "Custom crop prescription"
    },
    stamp: "Rx",
    label: "Crop plan",
    accent: "#1A6B7C",
    accentSoft: "rgba(26, 107, 124, 0.12)",
    tiltDeg: 5
  }
];

/** Same four services for static logo fallback clusters. */
export const AGRI_CLUSTER_ICONS = AGRI_ORBIT_ICONS;

const MCI_GLYPHS = MaterialCommunityIcons.glyphMap as Record<string, number>;
const ION_GLYPHS = Ionicons.glyphMap as Record<string, number>;

const MCI_FALLBACKS: Record<string, string> = {
  "clipboard-check-outline": "clipboard-pulse",
  "bottle-tonic-plus-outline": "flask-outline",
  prescription: "clipboard-pulse"
};

type IconProps = {
  icon: AgriProductIconDef;
  size: number;
};

export function AgriProductIcon({ icon, size }: IconProps) {
  if (icon.family === "mci") {
    const name =
      icon.name in MCI_GLYPHS
        ? icon.name
        : (MCI_FALLBACKS[icon.name] ?? "sprout");
    return (
      <MaterialCommunityIcons
        name={name as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={icon.color}
        accessibilityLabel={icon.service}
      />
    );
  }
  const name = icon.name in ION_GLYPHS ? icon.name : "leaf-outline";
  return (
    <Ionicons
      name={name as keyof typeof Ionicons.glyphMap}
      size={size}
      color={icon.color}
      accessibilityLabel={icon.service}
    />
  );
}
