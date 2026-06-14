import { Ionicons } from "@expo/vector-icons";

export type CategoryVisual = {
  emoji: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: "pest" | "disease" | "nutrient" | "other";
};

const BY_CODE: Record<string, CategoryVisual> = {
  pest: { emoji: "🐛", icon: "bug-outline", tint: "pest" },
  disease: { emoji: "🦠", icon: "medkit-outline", tint: "disease" },
  nutrient: { emoji: "🌱", icon: "leaf-outline", tint: "nutrient" },
  nutrition: { emoji: "🌱", icon: "leaf-outline", tint: "nutrient" },
  other: { emoji: "📋", icon: "ellipsis-horizontal-circle-outline", tint: "other" }
};

export function categoryVisualForCode(code?: string, name?: string): CategoryVisual {
  const key = (code || name || "").toLowerCase().trim();
  if (BY_CODE[key]) return BY_CODE[key];
  if (key.includes("pest")) return BY_CODE.pest;
  if (key.includes("disease")) return BY_CODE.disease;
  if (key.includes("nutrient") || key.includes("nutrition")) return BY_CODE.nutrient;
  return BY_CODE.other;
}
