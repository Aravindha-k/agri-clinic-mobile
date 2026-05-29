import { useEffect } from "react";
import { getCrops, getOptionLabel, MasterOption } from "../api/masters";
import { resolveCropValueForOptions } from "../utils/farmerPrefill";
import { useVisitFlow } from "./VisitFlowContext";

/** After crops load, fix crop select value when API returned a name instead of id. */
export function useResolveCropOnLoad() {
  const { values, meta, setValues, setMeta } = useVisitFlow();

  useEffect(() => {
    if (!values.crop && !meta.cropLabel) return;
    let cancelled = false;

    getCrops()
      .then((crops: MasterOption[]) => {
        if (cancelled) return;
        const resolved = resolveCropValueForOptions(values.crop, meta.cropLabel, crops);
        if (resolved && resolved !== values.crop) {
          setValues((v) => ({ ...v, crop: resolved }));
        }
        const match = crops.find((c) => String(c.id) === (resolved || values.crop));
        if (match) {
          setMeta((m) => ({ ...m, cropLabel: getOptionLabel(match) }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [values.crop, meta.cropLabel, setValues, setMeta]);
}
