import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/** Native stack — slide + fade, 200–250ms cinematic pass. */
export const stackScreenOptions: NativeStackNavigationOptions = {
  animation: "fade_from_bottom",
  animationDuration: 220
};

export const stackScreenOptionsModal: NativeStackNavigationOptions = {
  presentation: "modal",
  animation: "slide_from_bottom",
  animationDuration: 240
};

export const stackScreenOptionsPush: NativeStackNavigationOptions = {
  animation: "slide_from_right",
  animationDuration: 220
};

/** Tab switches — native stack handles push transitions between flows. */
export const tabScreenOptions: BottomTabNavigationOptions = {};
