import type { Visit } from "../api/visits";
import { getVisitDisplayDateTime } from "./format";
import type { ResolvedFarmer } from "./visitFarmer";

type TimelineIcon =
  | "play-circle-outline"
  | "person-outline"
  | "location-outline"
  | "chatbubble-ellipses-outline"
  | "checkmark-circle-outline";

export type VisitTimelineEvent = {
  title: string;
  subtitle: string;
  body: string;
  icon: TimelineIcon;
};

export function buildVisitTimelineEvents(visit: Visit, farmer: ResolvedFarmer): VisitTimelineEvent[] {
  const when = getVisitDisplayDateTime(visit);
  const hasGps = Boolean(visit.latitude && visit.longitude);
  const advice = visit.general_advice || visit.fertilizer_advice || visit.notes;

  return [
    {
      title: "Visit Started",
      subtitle: when,
      body: when !== "Not recorded" ? `Started ${when}` : "Not recorded",
      icon: "play-circle-outline"
    },
    {
      title: "Farmer Selected",
      subtitle: when,
      body: farmer.name !== "—" ? `${farmer.name} · ${farmer.village !== "—" ? farmer.village : "Village not set"}` : "Not recorded",
      icon: "person-outline"
    },
    {
      title: "Location Captured",
      subtitle: when,
      body: hasGps ? "GPS captured" : "Not recorded",
      icon: "location-outline"
    },
    {
      title: "Recommendation Added",
      subtitle: when,
      body: advice?.trim() ? advice.trim() : "Not recorded",
      icon: "chatbubble-ellipses-outline"
    },
    {
      title: "Visit Submitted",
      subtitle: when,
      body: when !== "Not recorded" ? `Submitted ${when}` : "Not recorded",
      icon: "checkmark-circle-outline"
    }
  ];
}
