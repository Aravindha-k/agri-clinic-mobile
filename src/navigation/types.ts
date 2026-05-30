import { NavigatorScreenParams } from "@react-navigation/native";
import type { VisitFormPrefill } from "../utils/farmerPrefill";

export type AuthStackParamList = {
  Login: undefined;
};

export type VisitsStackParamList = {
  VisitsList: undefined;
  VisitDetail: { id: number };
};

export type FarmersStackParamList = {
  FarmersList: undefined;
  FarmerDetail: { id: number };
  FarmerMap: FarmerMapParams;
};

export type VisitFlowParamList = {
  NewVisitFarmer: { prefill?: VisitFormPrefill; fresh?: boolean } | undefined;
  NewVisitDetails: undefined;
  VisitSummary: undefined;
  VisitSuccess: { visitId: number; queued: boolean; queueId?: string; evidenceWarning?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Farmers: NavigatorScreenParams<FarmersStackParamList>;
  StartVisit: undefined;
  Visits: NavigatorScreenParams<VisitsStackParamList>;
  Profile: undefined;
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
  FarmerMap: FarmerMapParams;
  OfflineSync: undefined;
  Notifications: undefined;
};
