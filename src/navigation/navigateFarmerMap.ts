import { CommonActions } from "@react-navigation/native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { FarmerMapParams } from "./types";

/** Open farmer map from Farmers list, detail, or other nested screens. */
export function navigateFarmerMap(navigation: NavigationProp<ParamListBase>, params: FarmerMapParams) {
  const farmerId = Number(params.farmerId);
  if (!Number.isFinite(farmerId) || farmerId <= 0) {
    return;
  }

  const payload: FarmerMapParams = {
    ...params,
    farmerId,
    farmerName: params.farmerName ? String(params.farmerName) : undefined,
    village: params.village != null ? String(params.village) : undefined
  };

  // Farmers stack (primary).
  if (navigation.getState().routeNames.includes("FarmerMap")) {
    navigation.navigate("FarmerMap", payload);
    return;
  }

  // Walk up to root stack screen.
  let parent = navigation.getParent();
  while (parent) {
    const names = parent.getState().routeNames;
    if (names.includes("FarmerMap")) {
      parent.navigate("FarmerMap", payload);
      return;
    }
    parent = parent.getParent();
  }

  navigation.dispatch(
    CommonActions.navigate({
      name: "FarmerMap",
      params: payload
    })
  );
}
