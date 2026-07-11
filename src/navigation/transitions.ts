import { Platform } from "react-native";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Colors } from "../../mobile/lib/theme";

const STACK_BG = { backgroundColor: Colors.bg };

/** Native stack — stable slide on Android (fade_from_bottom flashes on pop in release). */
export const stackScreenOptions: NativeStackNavigationOptions = {
  animation: Platform.OS === "android" ? "slide_from_right" : "fade_from_bottom",
  animationDuration: Platform.OS === "android" ? 220 : 200,
  contentStyle: STACK_BG
};

export const stackScreenOptionsModal: NativeStackNavigationOptions = {
  presentation: "modal",
  animation: "slide_from_bottom",
  animationDuration: 220,
  contentStyle: STACK_BG
};

export const stackScreenOptionsPush: NativeStackNavigationOptions = {
  animation: "slide_from_right",
  animationDuration: 220,
  contentStyle: STACK_BG
};

/** Tab switches — background handled by Tab.Navigator sceneContainerStyle. */
export const tabScreenOptions: BottomTabNavigationOptions = {};
