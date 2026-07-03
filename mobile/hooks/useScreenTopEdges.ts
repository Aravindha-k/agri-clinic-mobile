import type { Edge } from "react-native-safe-area-context";
import { useSyncStore } from "../lib/store/syncStore";

/** Top safe-area edge — skip when global sync strip already reserves status-bar inset. */
export function useScreenTopEdges(): Edge[] {
  const stripVisible = useSyncStore((state) => state.globalStripVisible);
  return stripVisible ? [] : ["top"];
}
