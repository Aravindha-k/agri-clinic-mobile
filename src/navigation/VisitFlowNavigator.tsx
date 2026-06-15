import { createNativeStackNavigator } from "@react-navigation/native-stack";
import VisitFlowShell from "../../mobile/app/visit/index";
import VisitSuccessScreen from "../../mobile/app/visit/success";
import { VisitFlowParamList } from "./types";
import { useTheme } from "../theme";
import { stackScreenOptionsPush } from "./transitions";

const Stack = createNativeStackNavigator<VisitFlowParamList>();

export function VisitFlowNavigator() {
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...stackScreenOptionsPush
      }}
    >
      <Stack.Screen name="NewVisitFarmer" component={VisitFlowShell} />
      <Stack.Screen name="VisitSuccess" component={VisitSuccessScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
