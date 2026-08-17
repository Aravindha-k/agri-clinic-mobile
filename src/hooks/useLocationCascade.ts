import { useCallback, useEffect, useRef, useState } from "react";
import { getDistricts, getTaluks, getVillages, type MasterOption, type TalukOption } from "../api/masters";
import {
  applyDistrictChange,
  applyTalukChange,
  applyVillageChange,
  type LocationCascadeSelection
} from "../utils/locationCascade";

export type CascadeLoadState = "idle" | "loading" | "error" | "empty";

type Options = {
  districts?: MasterOption[];
};

export function useLocationCascade(
  selection: LocationCascadeSelection,
  onChange: (next: LocationCascadeSelection) => void,
  options?: Options
) {
  const [districts, setDistricts] = useState<MasterOption[]>(options?.districts ?? []);
  const [taluks, setTaluks] = useState<TalukOption[]>([]);
  const [villages, setVillages] = useState<MasterOption[]>([]);
  const [districtsState, setDistrictsState] = useState<CascadeLoadState>("idle");
  const [taluksState, setTaluksState] = useState<CascadeLoadState>("idle");
  const [villagesState, setVillagesState] = useState<CascadeLoadState>("idle");
  const talukSeq = useRef(0);
  const villageSeq = useRef(0);

  const loadDistricts = useCallback(async () => {
    if (options?.districts?.length) {
      setDistricts(options.districts);
      setDistrictsState("idle");
      return;
    }
    setDistrictsState("loading");
    try {
      const rows = await getDistricts();
      setDistricts(rows);
      setDistrictsState(rows.length ? "idle" : "empty");
    } catch {
      setDistrictsState("error");
    }
  }, [options?.districts]);

  const loadTaluks = useCallback(async (districtId: string) => {
    const seq = ++talukSeq.current;
    if (!districtId) {
      setTaluks([]);
      setTaluksState("idle");
      return;
    }
    setTaluksState("loading");
    try {
      const rows = await getTaluks(districtId);
      if (seq !== talukSeq.current) return;
      setTaluks(rows);
      setTaluksState(rows.length ? "idle" : "empty");
    } catch {
      if (seq !== talukSeq.current) return;
      setTaluks([]);
      setTaluksState("error");
    }
  }, []);

  const loadVillages = useCallback(async (talukId: string) => {
    const seq = ++villageSeq.current;
    if (!talukId) {
      setVillages([]);
      setVillagesState("idle");
      return;
    }
    setVillagesState("loading");
    try {
      const rows = await getVillages({ taluk: talukId });
      if (seq !== villageSeq.current) return;
      setVillages(rows);
      setVillagesState(rows.length ? "idle" : "empty");
    } catch {
      if (seq !== villageSeq.current) return;
      setVillages([]);
      setVillagesState("error");
    }
  }, []);

  useEffect(() => {
    void loadDistricts();
  }, [loadDistricts]);

  useEffect(() => {
    void loadTaluks(selection.districtId);
  }, [loadTaluks, selection.districtId]);

  useEffect(() => {
    void loadVillages(selection.talukId);
  }, [loadVillages, selection.talukId]);

  const setDistrict = useCallback(
    (districtId: string) => {
      onChange(applyDistrictChange(selection, districtId));
    },
    [onChange, selection]
  );

  const setTaluk = useCallback(
    (talukId: string) => {
      onChange(applyTalukChange(selection, talukId));
    },
    [onChange, selection]
  );

  const setVillage = useCallback(
    (villageId: string) => {
      onChange(applyVillageChange(selection, villageId));
    },
    [onChange, selection]
  );

  return {
    districts,
    taluks,
    villages,
    districtsState,
    taluksState,
    villagesState,
    setDistrict,
    setTaluk,
    setVillage,
    retryTaluks: () => void loadTaluks(selection.districtId),
    retryVillages: () => void loadVillages(selection.talukId)
  };
}
