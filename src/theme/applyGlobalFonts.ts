import { Text, TextInput } from "react-native";
import { FONTS } from "./fonts";

/** Apply Inter as the default font for Text and TextInput after fonts load. */
export function applyGlobalFonts() {
  const defaultStyle = { fontFamily: FONTS.regular };

  const text = Text as typeof Text & { defaultProps?: { style?: object } };
  text.defaultProps = text.defaultProps ?? {};
  text.defaultProps.style = defaultStyle;

  const input = TextInput as typeof TextInput & { defaultProps?: { style?: object } };
  input.defaultProps = input.defaultProps ?? {};
  input.defaultProps.style = defaultStyle;
}
