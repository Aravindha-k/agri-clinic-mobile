import { CommonActions } from "@react-navigation/native";
import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export function isRootNavigationReady(): boolean {
  return rootNavigationRef.isReady();
}

/** Safe root-stack navigate — returns false when nav is not ready (no throw). */
export function navigateRoot(name: keyof RootStackParamList, params?: object): boolean {
  if (!rootNavigationRef.isReady()) {
    console.warn("[nav] root not ready:", String(name));
    return false;
  }
  try {
    rootNavigationRef.dispatch(
      CommonActions.navigate({
        name,
        params
      })
    );
    return true;
  } catch (err) {
    console.warn("[nav] navigate failed:", String(name), err instanceof Error ? err.message : err);
    return false;
  }
}

export function navigateMainTab(
  screen: "Today" | "Work" | "Day" | "Me" | "StartVisit",
  params?: Record<string, unknown>
): boolean {
  return navigateRoot("Main", { screen, params });
}

export function navigateVisitDetail(id: number, fromSubmit?: boolean): boolean {
  return navigateRoot("Main", {
    screen: "Work",
    params: { screen: "VisitDetail", params: { id, fromSubmit } }
  });
}

export function navigateVisitFlow(params?: {
  screen?: string;
  params?: Record<string, unknown>;
}): boolean {
  return navigateRoot("VisitFlow", {
    screen: params?.screen ?? "NewVisitFarmer",
    params: params?.params ?? { fresh: true }
  });
}

export function navigateOfflineSync(): boolean {
  return navigateRoot("OfflineSync");
}

export function navigateMyLocation(): boolean {
  return navigateRoot("MyLocation");
}

/** Dismiss modals and land on a main tab in one transition (avoids double fade/phasing). */
export function resetToMainTab(
  screen: "Today" | "Work" | "Day" | "Me" = "Today",
  params?: Record<string, unknown>
): boolean {
  if (!rootNavigationRef.isReady()) {
    console.warn("[nav] root not ready: resetToMainTab");
    return false;
  }
  try {
    rootNavigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main", params: { screen, params } }]
      })
    );
    return true;
  } catch (err) {
    console.warn("[nav] resetToMainTab failed", err instanceof Error ? err.message : err);
    return false;
  }
}

export function resetToVisitDetail(id: number, fromSubmit?: boolean): boolean {
  if (!rootNavigationRef.isReady()) return false;
  try {
    rootNavigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "Main",
            params: {
              screen: "Work",
              params: { screen: "VisitDetail", params: { id, fromSubmit } }
            }
          }
        ]
      })
    );
    return true;
  } catch {
    return false;
  }
}
