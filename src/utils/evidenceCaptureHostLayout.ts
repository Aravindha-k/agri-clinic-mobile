import { Dimensions, type ViewStyle } from "react-native";

/**
 * Positions the evidence capture tree just below the visible viewport at opacity 1.
 * Avoids zero-opacity ancestors (washed-out Android view-shot), negative z-index compositing,
 * and far off-screen coordinates (black JPEG).
 */
export function evidenceCaptureHostStyle(): ViewStyle {
  const { height: windowHeight, width: windowWidth } = Dimensions.get("window");
  return {
    position: "absolute",
    left: 0,
    top: windowHeight + 8,
    width: windowWidth,
    opacity: 1,
    overflow: "hidden"
  };
}

/** contentFit for evidence photo — full frame, no crop. */
export const EVIDENCE_PHOTO_CONTENT_FIT = "contain" as const;
