import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { AnimatedSplashScreen } from "../components/brand/AnimatedSplashScreen";
import { GlassTabBar } from "../components/glass";
import { useAppSplash } from "../hooks/useAppSplash";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../storage/AuthContext";
import { useTheme } from "../theme";
import { DS } from "../theme/globalStyles";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
import { StartupScreen } from "../screens/StartupScreen";
import { AuthStartScreen } from "../screens/AuthStartScreen";
import HomeTabScreen from "../../mobile/app/(tabs)/index";
import VisitsTabScreen from "../../mobile/app/(tabs)/visits";
import FarmersTabScreen from "../../mobile/app/(tabs)/farmers";
import FarmerProfileScreen from "../../mobile/app/farmer/[id]";
import ProfileTabScreen from "../../mobile/app/(tabs)/profile";
import ProblemsCatalogScreen from "../../mobile/app/problems";
import { FarmerMapScreen } from "../screens/map/FarmerMapScreen";
import { LiveMapScreen } from "../screens/map/LiveMapScreen";
import { TravelHistoryScreen } from "../screens/map/TravelHistoryScreen";
import { OfflineSyncScreen } from "../screens/OfflineSyncScreen";
import NotificationsScreen from "../../mobile/app/notifications";
import { SettingsScreen } from "../screens/SettingsScreen";
import { HelpScreen } from "../screens/HelpScreen";
import TrackingWorkspaceScreen from "../../mobile/app/tracking";
import VisitDetailScreen from "../../mobile/app/visit/[id]";
import { VisitFlowNavigator } from "./VisitFlowNavigator";
import {
  stackScreenOptions,
  stackScreenOptionsModal,
  stackScreenOptionsPush,
  tabScreenOptions
} from "./transitions";
import {
  AuthStackParamList,
  FarmersStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  RootStackParamList,
  VisitsStackParamList
} from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const VisitsStack = createNativeStackNavigator<VisitsStackParamList>();
const FarmersStack = createNativeStackNavigator<FarmersStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, ...stackScreenOptions }}>
      <AuthStack.Screen name="Login" component={AuthStartScreen} />
    </AuthStack.Navigator>
  );
}

function VisitsNavigator() {
  const { theme } = useTheme();
  return (
    <VisitsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...stackScreenOptions
      }}
    >
      <VisitsStack.Screen name="VisitsList" component={VisitsTabScreen} />
      <VisitsStack.Screen name="VisitDetail" component={VisitDetailScreen} />
    </VisitsStack.Navigator>
  );
}

function FarmersNavigator() {
  const { theme } = useTheme();
  return (
    <FarmersStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primaryDark },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "700" as const },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...stackScreenOptions
      }}
    >
      <FarmersStack.Screen name="FarmersList" component={FarmersTabScreen} options={{ headerShown: false }} />
      <FarmersStack.Screen name="FarmerDetail" component={FarmerProfileScreen} options={{ headerShown: false }} />
      <FarmersStack.Screen name="FarmerMap" component={FarmerMapScreen} options={{ headerShown: false }} />
    </FarmersStack.Navigator>
  );
}

function ProfileNavigator() {
  const { theme } = useTheme();
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...stackScreenOptions
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileTabScreen} />
      <ProfileStack.Screen name="TrackingWorkspace" component={TrackingWorkspaceScreen} />
      <ProfileStack.Screen name="ProblemsCatalog" component={ProblemsCatalogScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Help" component={HelpScreen} />
    </ProfileStack.Navigator>
  );
}

function StartVisitPlaceholder() {
  return <View />;
}

function MainTabs() {
  const { t } = useI18n();
  const pendingVisitsCount = useSyncStore((state) => state.pendingVisitsCount);

  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      sceneContainerStyle={{ flex: 1, backgroundColor: "transparent" }}
      screenOptions={{
        ...tabScreenOptions,
        headerShown: false,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTabScreen}
        options={{ tabBarLabel: t("tabs.home") }}
      />
      <Tab.Screen
        name="Farmers"
        component={FarmersNavigator}
        options={{ tabBarLabel: t("tabs.farmers") }}
      />
      <Tab.Screen
        name="StartVisit"
        component={StartVisitPlaceholder}
        options={{
          tabBarLabel: ""
        }}
      />
      <Tab.Screen
        name="Visits"
        component={VisitsNavigator}
        options={{
          tabBarLabel: t("tabs.visits"),
          tabBarBadge:
            pendingVisitsCount > 0 ? (pendingVisitsCount > 99 ? "99+" : pendingVisitsCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: DS.danger,
            fontSize: 9,
            fontWeight: "700",
            lineHeight: 14
          }
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{ tabBarLabel: t("tabs.profile") }}
      />
    </Tab.Navigator>
  );
}

function AppRoutes() {
  const { isReady, isAuthenticated, authLoading, bootstrapIssue } = useAuth();
  const { hideNativeSplash } = useAppSplash(true);
  const [introDone, setIntroDone] = useState(false);

  const handleIntroFinish = useCallback(() => setIntroDone(true), []);
  const authSettled = isReady && !authLoading;
  const showIntro = !introDone || !authSettled;

  if (showIntro) {
    return (
      <AnimatedSplashScreen onFinish={handleIntroFinish} onReady={hideNativeSplash} />
    );
  }

  if (bootstrapIssue !== "none") {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Splash" component={StartupScreen} />
      </RootStack.Navigator>
    );
  }

  if (isAuthenticated) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false, ...stackScreenOptions }}>
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen
          name="VisitFlow"
          component={VisitFlowNavigator}
          options={stackScreenOptionsModal}
        />
        <RootStack.Screen name="LiveMap" component={LiveMapScreen} options={{ contentStyle: { flex: 1 }, ...stackScreenOptionsPush }} />
        <RootStack.Screen name="TravelHistory" component={TravelHistoryScreen} options={{ contentStyle: { flex: 1 }, ...stackScreenOptionsPush }} />
        <RootStack.Screen name="FarmerMap" component={FarmerMapScreen} options={{ contentStyle: { flex: 1 }, ...stackScreenOptionsPush }} />
        <RootStack.Screen
          name="OfflineSync"
          component={OfflineSyncScreen}
          options={{ contentStyle: { flex: 1 }, ...stackScreenOptionsPush }}
        />
        <RootStack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ contentStyle: { flex: 1 }, ...stackScreenOptionsPush }}
        />
      </RootStack.Navigator>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Auth" component={AuthNavigator} />
    </RootStack.Navigator>
  );
}

export function RootNavigator() {
  const { theme, isDark } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.background,
      primary: theme.colors.primary,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border
    }
  };

  return (
    <NavigationContainer theme={navTheme}>
      <AppRoutes />
    </NavigationContainer>
  );
}
