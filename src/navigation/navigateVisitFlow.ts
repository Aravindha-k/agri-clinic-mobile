import type { NavigationProp, ParamListBase } from "@react-navigation/native";

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
      nav.navigate("VisitFlow", params);
      return true;
    }
    nav = nav.getParent?.() as NavigationProp<ParamListBase> | undefined;
  }
  return false;
}
