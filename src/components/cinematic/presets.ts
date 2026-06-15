import type { AuroraBlob } from "./AuroraBackground";

export const CINEMATIC_BG = "#060f09";

export const AURORA_HOME: AuroraBlob[] = [
  { color: "#16a34a", size: 180, top: -50, right: -30, opacity: 0.15, duration: 9000, delay: 0 },
  { color: "#065f46", size: 120, bottom: 120, left: -20, opacity: 0.12, duration: 11000, delay: 3000 }
];

export const AURORA_FARMERS: AuroraBlob[] = [
  { color: "#16a34a", size: 150, top: -30, right: -20, opacity: 0.12, duration: 9000, delay: 0 },
  { color: "#4ade80", size: 100, bottom: 60, right: 30, opacity: 0.06, duration: 7000, delay: 2000 }
];

export const AURORA_VISITS: AuroraBlob[] = [
  { color: "#065f46", size: 130, bottom: 100, left: -30, opacity: 0.11, duration: 10000, delay: 1000 }
];

export const AURORA_PROFILE: AuroraBlob[] = [
  { color: "#16a34a", size: 160, top: -40, right: -20, opacity: 0.14, duration: 9000, delay: 0 },
  { color: "#065f46", size: 110, bottom: 80, left: -20, opacity: 0.1, duration: 11000, delay: 2000 }
];

export const AURORA_SUCCESS: AuroraBlob[] = [
  { color: "#16a34a", size: 220, top: -40, left: -30, opacity: 0.2, duration: 8000, delay: 0 },
  { color: "#4ade80", size: 160, bottom: 80, right: -20, opacity: 0.12, duration: 9000, delay: 1500 },
  { color: "#065f46", size: 140, top: "40%", left: "20%", opacity: 0.1, duration: 10000, delay: 800 }
];

export const SECTION_LABEL_STYLE = {
  color: "rgba(255,255,255,0.25)",
  fontFamily: "Inter_700Bold",
  fontSize: 8.5,
  fontWeight: "700" as const,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const
};

export const CINEMATIC_ACCENT = {
  activeIcon: "#4caf82",
  activeTab: "#4caf82",
  chipBg: "rgba(76,175,130,0.12)",
  chipBorder: "rgba(76,175,130,0.25)",
  chipText: "#86efac",
  inputFocusBorder: "rgba(76,175,130,0.6)"
};
