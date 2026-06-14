import { useEffect, useState } from "react";
import { getLanOnlyMode, subscribeLanOnly } from "../utils/connectivityBus";

export function useLanOnlyMode() {
  const [active, setActive] = useState(getLanOnlyMode);

  useEffect(() => subscribeLanOnly(setActive), []);

  return active;
}
