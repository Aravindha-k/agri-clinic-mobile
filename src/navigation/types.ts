import { NavigatorScreenParams } from "@react-navigation/native";
import type { VisitFormPrefill } from "../utils/farmerPrefill";
import type { SubmittedVisitSummary } from "../types/submittedVisitSummary";

export type AuthStackParamList = {
  Login: undefined;
};

export type VisitsStackParamList = {
  VisitsList: undefined;
  VisitDetail: { id: number; fromSubmit?: boolean };
};

export type FarmersStackParamList = {
  FarmersList: undefined;
  FarmerDetail: { id: number };
  FarmerMap: FarmerMapParams;
};

/** V2 Work tab — queue + visits with shared detail routes. */
export type WorkStackParamList = {
  WorkHome: { segment?: "queue" | "visits" } | undefined;
  FarmerDetail: { id: number };
  FarmerMap: FarmerMapParams;
  VisitDetail: { id: number; fromSubmit?: boolean };
};

export type VisitFlowParamList = {
  NewVisitFarmer: { prefill?: VisitFormPrefill; fresh?: boolean; fastRevisit?: boolean } | undefined;
  VisitSuccess: {
    summary: SubmittedVisitSummary;
  };
};

export type MeStackParamList = {
  ProfileMain: undefined;
  ProblemsCatalog: undefined;
  Diagnostics: undefined;
  Settings: undefined;
  Help: undefined;
};

/** @deprecated Use MeStackParamList */
export type ProfileStackParamList = MeStackParamList & {
  TrackingWorkspace?: undefined;
};

/** @deprecated Use MeStackParamList — kept for deep-link compatibility */
export type MoreStackParamList = MeStackParamList & {
  MoreMenu?: undefined;
  Profile?: undefined;
  Visits?: NavigatorScreenParams<VisitsStackParamList>;
};

export type MainTabParamList = {
  Today: undefined;
  Work: NavigatorScreenParams<WorkStackParamList>;
  StartVisit: undefined;
  Day: undefined;
  Me: NavigatorScreenParams<MeStackParamList>;
};

/** @deprecated V1 tab names — use MainTabParamList */
export type LegacyMainTabParamList = {
  Home: undefined;
  Farmers: NavigatorScreenParams<FarmersStackParamList>;
  StartVisit: undefined;
  Visits: NavigatorScreenParams<VisitsStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type FarmerMapParams = {
  farmerId: number;
  farmerName?: string;
  village?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export type RootStackParamList = {
  Splash: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  VisitFlow: NavigatorScreenParams<VisitFlowParamList>;
  LiveMap: undefined;
  TravelHistory: undefined;
  MyLocation: undefined;
  FarmerMap: FarmerMapParams;
  OfflineSync: undefined;
  SyncStatus: undefined;
  Notifications: undefined;
  FieldTrackingSetup: { focusMissing?: import("../features/fieldTrackingSetup").SetupStepId[] } | undefined;
};
