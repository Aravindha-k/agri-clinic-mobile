import { createNativeStackNavigator } from "@react-navigation/native-stack";
import VisitFlowShell from "../../mobile/app/visit/index";
import VisitSuccessScreen from "../../mobile/app/visit/success";
import { VisitFlowParamList } from "./types";
import { useTheme } from "../theme";

const Stack = createNativeStackNavigator<VisitFlowParamList>();

export function VisitFlowNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    >
      <Stack.Screen name="NewVisitFarmer" component={VisitFlowShell} />
      <Stack.Screen name="VisitSuccess" component={VisitSuccessScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
