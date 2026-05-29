import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { VisitFlowProvider } from "../visit/VisitFlowContext";
import { NewVisitFarmerScreen } from "../screens/visit/NewVisitFarmerScreen";
import { NewVisitDetailsScreen } from "../screens/visit/NewVisitDetailsScreen";
import { VisitSummaryScreen } from "../screens/visit/VisitSummaryScreen";
import { VisitSuccessScreen } from "../screens/visit/VisitSuccessScreen";
import { VisitFlowParamList } from "./types";
import { useTheme } from "../theme";

const Stack = createNativeStackNavigator<VisitFlowParamList>();

export function VisitFlowNavigator() {
  const { theme } = useTheme();

  return (
    <VisitFlowProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      >
        <Stack.Screen name="NewVisitFarmer" component={NewVisitFarmerScreen} />
        <Stack.Screen name="NewVisitDetails" component={NewVisitDetailsScreen} />
        <Stack.Screen name="VisitSummary" component={VisitSummaryScreen} />
        <Stack.Screen name="VisitSuccess" component={VisitSuccessScreen} options={{ gestureEnabled: false }} />
      </Stack.Navigator>
    </VisitFlowProvider>
  );
}
