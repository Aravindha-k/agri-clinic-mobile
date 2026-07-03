import type { ViewStyle } from "react-native";
import { PremiumRadius } from "./designSystem";

/** Distinct surface treatments — breaks white-card monotony on Today. */
export const TodaySurfaces = {
  weather: {
    borderRadius: PremiumRadius.card,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 196, 0.14)",
    overflow: "hidden" as const
  },
  plan: {
    borderRadius: PremiumRadius.card,
    borderWidth: 1,
    borderColor: "rgba(15, 107, 67, 0.14)",
    overflow: "hidden" as const
  },
  fieldHealth: {
    borderRadius: PremiumRadius.card,
    borderWidth: 1,
    borderColor: "rgba(212, 160, 23, 0.12)",
    overflow: "hidden" as const
  },
  activity: {
    borderRadius: PremiumRadius.card,
    borderWidth: 1,
    borderColor: "rgba(15, 61, 40, 0.08)",
    overflow: "hidden" as const
  },
  quickAction: {
    borderRadius: PremiumRadius.card,
    borderWidth: 1,
    borderColor: "rgba(15, 61, 40, 0.1)",
    overflow: "hidden" as const
  },
  greeting: {
    borderRadius: PremiumRadius.hero,
    borderWidth: 1,
    borderColor: "rgba(15, 107, 67, 0.1)",
    overflow: "hidden" as const
  }
} satisfies Record<string, ViewStyle>;

export const TodayGradients = {
  weather: ["#E8F2FC", "#D6E9F8", "#F5FAFF"] as const,
  plan: ["rgba(46,155,100,0.14)", "rgba(232,245,238,0.85)", "rgba(255,255,255,0.92)"] as const,
  fieldHealth: ["#FBF8F0", "#F5F0E4", "#FFFCF7"] as const,
  quickAction: ["rgba(255,255,255,0.72)", "rgba(244,247,245,0.95)"] as const,
  greeting: ["#F0F7F2", "#E8F3EC", "#FAFCFB", "#FFFFFF"] as const
} as const;

/** Vertical rhythm between Today sections */
export const TodaySectionGap = 20;
