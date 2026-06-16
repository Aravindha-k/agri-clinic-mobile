import { createContext, useContext, type ReactNode } from "react";

const VisitEntranceContext = createContext<number | string>(1);

export function VisitEntranceProvider({
  replayKey,
  children
}: {
  replayKey: number | string;
  children: ReactNode;
}) {
  return <VisitEntranceContext.Provider value={replayKey}>{children}</VisitEntranceContext.Provider>;
}

export function useVisitEntranceKey() {
  return useContext(VisitEntranceContext);
}
