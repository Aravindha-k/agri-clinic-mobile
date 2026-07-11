import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { navigateVisitFlow as navigateVisitFlowRoot } from "./rootNavigationRef";

type VisitFlowParams = {
  screen?: string;
  params?: Record<string, unknown>;
};

/** Walk up navigators until VisitFlow is reachable (root stack). */
export function navigateToVisitFlow(
  navigation: NavigationProp<ParamListBase>,
  params: VisitFlowParams = { screen: "NewVisitFarmer", params: { fresh: true } }
): boolean {
  let nav: NavigationProp<ParamListBase> | undefined = navigation;
  for (let depth = 0; depth < 6 && nav; depth += 1) {
    const routeNames = nav.getState?.().routeNames;
    if (routeNames?.includes("VisitFlow")) {
      try {
        nav.navigate("VisitFlow", params);
        return true;
      } catch {
        break;
      }
    }
    nav = nav.getParent?.() as NavigationProp<ParamListBase> | undefined;
  }
  return navigateVisitFlowRoot(params);
}
