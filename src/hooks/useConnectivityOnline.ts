import { useEffect, useState } from "react";
import { subscribeConnectivity } from "../utils/connectivityBus";

export function useConnectivityOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => subscribeConnectivity(setOnline), []);

  return online;
}
