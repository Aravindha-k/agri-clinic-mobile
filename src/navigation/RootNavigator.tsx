import { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";
import { AppStartupIntro } from "../components/auth/AppStartupIntro";
import { useAuth } from "../storage/AuthContext";
import { getAccessToken } from "../storage/tokenStorage";
import { useTheme } from "../theme";
import { BootstrapScreen } from "../screens/BootstrapScreen";
import { AuthStartScreen } from "../screens/AuthStartScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { VisitsListScreen } from "../screens/VisitsListScreen";
import { FarmersListScreen } from "../screens/FarmersListScreen";
import { FarmerDetailScreen } from "../screens/FarmerDetailScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { FarmerMapScreen } from "../screens/map/FarmerMapScreen";
import { LiveMapScreen } from "../screens/map/LiveMapScreen";
import { TravelHistoryScreen } from "../screens/map/TravelHistoryScreen";
import { OfflineSyncScreen } from "../screens/OfflineSyncScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { VisitDetailTimelineScreen } from "../screens/visit/VisitDetailTimelineScreen";
import { BottomNav } from "../components/ui";
import { VisitFlowNavigator } from "./VisitFlowNavigator";
import {
  AuthStackParamList,
  FarmersStackParamList,
  MainTabParamList,
  RootStackParamList,
  VisitsStackParamList
} from "./types";

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const VisitsStack = createNativeStackNavigator<VisitsStackParamList>();
const FarmersStack = createNativeStackNavigator<FarmersStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
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
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    >
      <VisitsStack.Screen name="VisitsList" component={VisitsListScreen} />
      <VisitsStack.Screen name="VisitDetail" component={VisitDetailTimelineScreen} />
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
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    >
      <FarmersStack.Screen name="FarmersList" component={FarmersListScreen} options={{ headerShown: false }} />
      <FarmersStack.Screen name="FarmerDetail" component={FarmerDetailScreen} options={{ headerShown: false }} />
      <FarmersStack.Screen name="FarmerMap" component={FarmerMapScreen} options={{ headerShown: false }} />
    </FarmersStack.Navigator>
  );
}

function StartVisitPlaceholder() {
  return <View />;
}

function MainTabs() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      sceneContainerStyle={{ flex: 1, backgroundColor: theme.colors.background }}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Home" }} />
      <Tab.Screen name="Farmers" component={FarmersNavigator} options={{ tabBarLabel: "Farmers" }} />
      <Tab.Screen name="StartVisit" component={StartVisitPlaceholder} options={{ tabBarLabel: "" }} />
      <Tab.Screen name="Visits" component={VisitsNavigator} options={{ tabBarLabel: "Visits" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "Profile" }} />
    </Tab.Navigator>
  );
}

function AppRoutes() {
  const { isReady, isAuthenticated, authLoading, bootstrapIssue } = useAuth();

  const showBootstrap = !isReady || authLoading || bootstrapIssue !== "none";

  if (showBootstrap) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Splash" component={BootstrapScreen} />
      </RootStack.Navigator>
    );
  }

  if (isAuthenticated) {
    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={MainTabs} />
        <RootStack.Screen
          name="VisitFlow"
          component={VisitFlowNavigator}
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <RootStack.Screen name="LiveMap" component={LiveMapScreen} options={{ contentStyle: { flex: 1 } }} />
        <RootStack.Screen name="TravelHistory" component={TravelHistoryScreen} options={{ contentStyle: { flex: 1 } }} />
        <RootStack.Screen name="FarmerMap" component={FarmerMapScreen} options={{ contentStyle: { flex: 1 } }} />
        <RootStack.Screen
          name="OfflineSync"
          component={OfflineSyncScreen}
          options={{ contentStyle: { flex: 1 }, animation: "slide_from_right" }}
        />
        <RootStack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ contentStyle: { flex: 1 }, animation: "slide_from_right" }}
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
  const { isReady, isAuthenticated, loginNotice } = useAuth();
  const [introComplete, setIntroComplete] = useState(false);
  const [hadStoredToken, setHadStoredToken] = useState<boolean | null>(null);

  useEffect(() => {
    void getAccessToken().then((token) => {
      setHadStoredToken(Boolean(token));
      if (token) {
        setIntroComplete(true);
      }
    });
  }, []);

  useEffect(() => {
    if (loginNotice) {
      setIntroComplete(true);
    }
  }, [loginNotice]);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      setIntroComplete(true);
    }
  }, [isAuthenticated, isReady]);

  const showIntro = hadStoredToken === false && !introComplete;

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
      {showIntro ? <AppStartupIntro onComplete={() => setIntroComplete(true)} /> : null}
    </NavigationContainer>
  );
}
