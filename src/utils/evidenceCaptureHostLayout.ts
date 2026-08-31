import { Dimensions, type ViewStyle } from "react-native";

/**
 * Positions the evidence capture tree just below the visible viewport at opacity 1.
 * Avoids zero-opacity ancestors (washed-out Android view-shot) and far off-screen -4000 (black JPEG).
 */
export function evidenceCaptureHostStyle(): ViewStyle {
  const { height: windowHeight, width: windowWidth } = Dimensions.get("window");
  return {
    position: "absolute",
    left: 0,
    top: windowHeight + 8,
    width: windowWidth,
    opacity: 1,
    zIndex: -1
  };
}

/** resizeMode for evidence photo — full frame, no crop. */
export const EVIDENCE_PHOTO_RESIZE_MODE = "contain" as const;
