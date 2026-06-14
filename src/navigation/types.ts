import { NavigatorScreenParams } from "@react-navigation/native";
import type { VisitFormPrefill } from "../utils/farmerPrefill";

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

export type VisitFlowParamList = {
  NewVisitFarmer: { prefill?: VisitFormPrefill; fresh?: boolean; fastRevisit?: boolean } | undefined;
  VisitSuccess: {
    visitId: number;
    queued: boolean;
    queueId?: string;
    evidenceWarning?: string;
    farmerId?: string;
    farmerName?: string;
    village?: string;
    savedCrop?: string;
    savedObservation?: string;
    savedProblemSeen?: string;
    savedRecommendation?: string;
    savedActionTaken?: string;
    savedFollowUpDate?: string;
    submittedAt?: string;
    gpsConfirmed?: boolean;
  };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  TrackingWorkspace: undefined;
  ProblemsCatalog: undefined;
  Settings: undefined;
  Help: undefined;
};

/** @deprecated Use ProfileStackParamList — kept for deep-link compatibility */
export type MoreStackParamList = ProfileStackParamList & {
  MoreMenu?: undefined;
  Profile?: undefined;
  Visits?: NavigatorScreenParams<VisitsStackParamList>;
};

export type MainTabParamList = {
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
  FarmerMap: FarmerMapParams;
  OfflineSync: undefined;
  Notifications: undefined;
};
