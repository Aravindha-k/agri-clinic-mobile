import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { GlobalStatusStrip } from "../../mobile/components/layout/GlobalStatusStrip";
import { AnimatedSplashScreen } from "../components/brand/AnimatedSplashScreen";
import MainTabBar from "../../mobile/components/navigation/MainTabBar";
import { VisitFabTabButton } from "../components/ui/VisitFabTabButton";
import { useAppSplash } from "../hooks/useAppSplash";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../storage/AuthContext";
import { useTheme } from "../theme";
import { Colors } from "../../mobile/lib/theme";
import { useSyncStore } from "../../mobile/lib/store/syncStore";
import { StartupScreen } from "../screens/StartupScreen";
import { AuthStartScreen } from "../screens/AuthStartScreen";
import HomeTabScreen from "../../mobile/app/(tabs)/index";
import WorkTabScreen from "../../mobile/app/(tabs)/work";
import FarmerProfileScreen from "../../mobile/app/farmer/[id]";
import ProfileTabScreen from "../../mobile/app/(tabs)/profile";
import ProblemsCatalogScreen from "../../mobile/app/problems";
import { FarmerMapScreen } from "../screens/map/FarmerMapScreen";
import { LiveMapScreen } from "../screens/map/LiveMapScreen";
import { TravelHistoryScreen } from "../screens/map/TravelHistoryScreen";
import { OfflineSyncScreen } from "../screens/OfflineSyncScreen";
import DiagnosticsScreen from "../../mobile/app/me/diagnostics";
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
  MainTabParamList,
  MeStackParamList,
  RootStackParamList,
  WorkStackParamList
} from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const WorkStack = createNativeStackNavigator<WorkStackParamList>();
const MeStack = createNativeStackNavigator<MeStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, ...stackScreenOptions }}>
      <AuthStack.Screen name="Login" component={AuthStartScreen} />
    </AuthStack.Navigator>
  );
}

function WorkNavigator() {
  const { theme } = useTheme();
  return (
    <WorkStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...stackScreenOptions
      }}
    >
      <WorkStack.Screen name="WorkHome" component={WorkTabScreen} />
      <WorkStack.Screen name="FarmerDetail" component={FarmerProfileScreen} />
      <WorkStack.Screen name="FarmerMap" component={FarmerMapScreen} />
      <WorkStack.Screen name="VisitDetail" component={VisitDetailScreen} />
    </WorkStack.Navigator>
  );
}

function MeNavigator() {
  const { theme } = useTheme();
  return (
    <MeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...stackScreenOptions
      }}
    >
      <MeStack.Screen name="ProfileMain" component={ProfileTabScreen} />
      <MeStack.Screen name="ProblemsCatalog" component={ProblemsCatalogScreen} />
      <MeStack.Screen name="Diagnostics" component={DiagnosticsScreen} />
      <MeStack.Screen name="Settings" component={SettingsScreen} />
      <MeStack.Screen name="Help" component={HelpScreen} />
    </MeStack.Navigator>
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
      tabBar={(props) => <MainTabBar {...props} />}
      sceneContainerStyle={{ flex: 1, backgroundColor: Colors.bg }}
      screenOptions={{
        ...tabScreenOptions,
        headerShown: false,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tab.Screen
        name="Today"
        component={HomeTabScreen}
        options={{ tabBarLabel: t("tabs.today") }}
      />
      <Tab.Screen
        name="Work"
        component={WorkNavigator}
        options={{
          tabBarLabel: t("tabs.work"),
          tabBarBadge:
            pendingVisitsCount > 0 ? (pendingVisitsCount > 99 ? "99+" : pendingVisitsCount) : undefined
        }}
      />
      <Tab.Screen
        name="StartVisit"
        component={StartVisitPlaceholder}
        options={{
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: t("tabs.newVisit"),
          tabBarButton: (props) => <VisitFabTabButton {...props} />
        }}
      />
      <Tab.Screen
        name="Day"
        component={TrackingWorkspaceScreen}
        options={{ tabBarLabel: t("tabs.day") }}
      />
      <Tab.Screen
        name="Me"
        component={MeNavigator}
        options={{ tabBarLabel: t("tabs.me") }}
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
      <View style={{ flex: 1 }}>
        <GlobalStatusStrip />
        <View style={{ flex: 1 }}>
          <AppRoutes />
        </View>
      </View>
    </NavigationContainer>
  );
}
